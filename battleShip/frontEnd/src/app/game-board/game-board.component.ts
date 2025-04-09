import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { PusherService } from '../pusher.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';


interface Cell {
  hasShip: boolean;
  isHit: boolean;
  isMiss: boolean;
}

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css']
})
// Add these properties to the class
export class GameBoardComponent implements OnInit, OnDestroy {

  private ReadChangeTurnSubscription: Subscription = new Subscription();
  private GameOverSubscription: Subscription = new Subscription();

  boardSize = 8;
  isPlayer1: boolean = false;

  myBoard: Cell[][] = [];
  opponentBoard: Cell[][] = [];
  isGameOver = false; // Add this property
  gameStats = {
    totalShots: 0,
    hits: 0,
    misses: 0,
    winner: '',
    loser: ''
  };
  isLoading = true;

  gameId!: number;
  currentTurn!: string; // 'me' or 'opponent'
  message = '';
  error = '';
  token = localStorage.getItem('token');
  playerId!: number; // Para saber si somos player1 o player2
  statusGame = '';


  constructor(private route: ActivatedRoute, private http: HttpClient, private pusherService: PusherService,  private router: Router) {}

  ngOnInit(): void {
    this.gameId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchPlayerId(); // Añade esta llamada

  }



  fetchPlayerId(): void {
    this.http.get<any>(`${environment.apiUrl}/user`, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (user) => {
        this.playerId = user.id;
        this.subscribeToGameReadChangeTurn();
        this.subscribeToGameOver();
          
        this.fetchGameState();  // Llamar a fetchGameState solo después de obtener el playerId
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al obtener ID de usuario:', err);
      }
    });
  }
  


  createEmptyBoard(): Cell[][] {
    const board: Cell[][] = [];
    for (let i = 0; i < this.boardSize; i++) {
      board[i] = [];
      for (let j = 0; j < this.boardSize; j++) {
        board[i][j] = { hasShip: false, isHit: false, isMiss: false };
      }
    }
    return board;
  }

  // Modify the attackCell method
  attackCell(row: number, col: number): void {
    if (this.currentTurn !== 'me' || this.isGameOver) {
      return;
    }
  
    if (this.opponentBoard[row][col].isHit || this.opponentBoard[row][col].isMiss) {
      this.message = 'Ya atacaste esta celda';
      return;
    }
  
    
    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/attack`, {
      row: row,
      col: col,
      isHit: this.opponentBoard[row][col].hasShip,
      playerId: this.playerId,
      gameId: this.gameId
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (response) => {
        
        const hasShip = this.opponentBoard[row][col].hasShip;
        
        if (hasShip) {
          this.message = '¡Le diste a un barco! 🎯';
          this.opponentBoard[row][col].isHit = true;
          this.opponentBoard[row][col].hasShip = true;
          this.gameStats.hits++;
        } else {
          this.message = 'Agua... 💦';
          this.opponentBoard[row][col].isMiss = true;
          this.gameStats.misses++;
        }
        
        this.gameStats.totalShots++;
        this.checkGameOver();
      },
      error: (err) => {
        console.error('Error al atacar:', err);
        this.message = err.error?.message || 'Error en el ataque';
      }
    });
  }

  // Add this new method to check for game completion
  // Modify the checkGameOver method
  private checkGameOver(): void {
    let totalShips = 0;
    let hitShips = 0;
  
    for (let i = 0; i < this.boardSize; i++) {
      for (let j = 0; j < this.boardSize; j++) {
        if (this.opponentBoard[i][j].hasShip) {
          totalShips++;
          if (this.opponentBoard[i][j].isHit) {
            hitShips++;
          }
        }
      }
    }
  
    if (totalShips > 0 && totalShips === hitShips) {
      this.isGameOver = true;
      this.gameStats.winner = 'Tú';
      this.gameStats.loser = 'Oponente';
      this.message = '¡Felicitaciones! Has ganado el juego! 🎉';
      
      // Notify the server about game over with attack details
      this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/gameover`, {
        winnerId: this.playerId,
        gameStats: {
          player_shots: !this.isPlayer1 ? this.gameStats.totalShots : 0,
          hits: this.gameStats.hits,
          misses: this.gameStats.misses,
          accuracy: this.gameStats.totalShots > 0 ? 
            (this.gameStats.hits / this.gameStats.totalShots * 100).toFixed(1) : 0,
          total_moves: this.gameStats.totalShots
        }
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      }).subscribe({
        next: (response) => {
          console.log('Game statistics saved:', response);
        },
        error: (err) => {
          console.error('Error saving game statistics:', err);
        }
      });
    }
  }

  // Add method to handle opponent's victory
  // Modify handleOpponentVictory method
  private handleOpponentVictory(): void {
    this.isGameOver = true;
    this.gameStats.winner = 'Oponente';
    this.gameStats.loser = 'Tú';
    this.message = 'Game Over - ¡Ha ganado tu oponente! 🏆';
    this.currentTurn = '';
  
    // Send game statistics even when losing
    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/gameover`, {
      winnerId: this.playerId,
      gameStats: {
        player1_shots: this.isPlayer1 ? this.gameStats.totalShots : 0,
        player2_shots: !this.isPlayer1 ? this.gameStats.totalShots : 0,
        hits: this.gameStats.hits,
        misses: this.gameStats.misses,
        accuracy: this.gameStats.totalShots > 0 ? 
          (this.gameStats.hits / this.gameStats.totalShots * 100).toFixed(1) : 0,
        total_moves: this.gameStats.totalShots
      }
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (response) => {
        console.log('Game statistics saved:', response);
      },
      error: (err) => {
        console.error('Error saving game statistics:', err);
      }
    });
  }

  // Modify updateBoards method to check for game over state
  private updateBoards(gameData: any): void {
    if (!gameData) {
      console.error('Game data is undefined');
      return;
    }

    // Add game over check
    if (gameData.isGameOver) {
      this.isGameOver = true;
      if (gameData.winnerId !== this.playerId) {
        this.handleOpponentVictory();
      }
    }

    const isPlayer1 = this.playerId === gameData.player1_id;
    
    // Keep existing board if new data doesn't include board information
    if (gameData.myBoard && gameData.opponentBoard) {
      // Get the correct boards using the actual property names
      const myBoardData = isPlayer1 ? gameData.myBoard : gameData.opponentBoard;
      const opponentBoardData = isPlayer1 ? gameData.opponentBoard : gameData.myBoard;
      
      // Update boards only if we have valid board data
      this.myBoard = this.initializeBoardFromData(myBoardData, false);
      this.opponentBoard = this.initializeBoardFromData(opponentBoardData, true);
    }
      
    // Update turn based on either currentTurn or current_turn
    const turnId = gameData.currentTurn || gameData.current_turn;
    if (turnId !== undefined) {
      this.currentTurn = turnId === this.playerId ? 'me' : 'opponent';
    }
  }



  // Add the subscription method as a private method
  private subscribeToGameReadChangeTurn(): void {
    this.ReadChangeTurnSubscription?.unsubscribe();
    this.ReadChangeTurnSubscription = this.pusherService
      .subscribeToChannel('game-channel', 'game.changeTurn')
      .subscribe(
        (data: any) => {
          console.log('Evento changeTurn recibido:', data);
          
          if (data.game.id === this.gameId) {
            // Only update what we receive, don't clear existing board data
            this.updateBoards({
              ...data.game,
              current_turn: data.game.current_turn
            });
          }
        },
        error => {
          console.error('Error en Pusher:', error);
          this.error = 'Error de conexión con el servidor';
        }
      );
  }
  private subscribeToGameOver(): void {
    this.GameOverSubscription?.unsubscribe();
    this.GameOverSubscription = this.pusherService
      .subscribeToChannel('game-channel', 'game.gameOver')
      .subscribe(
        (data: any) => {
          if(data.game.id === this.gameId){
            this.currentTurn = '';
            this.isGameOver = true;

            
          }
        },
        error => {
          console.error('Error en Pusher:', error);
          this.error = 'Error de conexión con el servidor';
        }
      );
  }

  private initializeBoardFromData(boardData: any[][] | undefined, isOpponentBoard = false): Cell[][] {
    if (!boardData || !Array.isArray(boardData)) {
      console.error('Board data is invalid:', boardData);
      return this.createEmptyBoard();
    }
  
    return boardData.map((row, i) => {
      return row.map((cell, j) => {
        if (!cell) return { hasShip: false, isHit: false, isMiss: false };
  
        // Para el tablero del oponente, mostrar todo temporalmente
        if (isOpponentBoard) {
          return {
            hasShip: Boolean(cell.hasShip), // Ahora mostramos los barcos del oponente
            isHit: Boolean(cell.isHit),
            isMiss: Boolean(cell.isMiss)
          };
        }
        
        // Para mi tablero, mostrar todo
        return {
          hasShip: Boolean(cell.hasShip),
          isHit: Boolean(cell.isHit),
          isMiss: Boolean(cell.isMiss)
        };
      });
    });
  }
  // Remove or replace updateGameState with updateBoards
  fetchGameState(): void {
    this.http.get<any>(`${environment.apiUrl}/games/${this.gameId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (data) => {
        this.updateBoards(data);  // Use updateBoards instead of updateGameState
      },
      error: (err) => {
        console.error('Error al cargar el estado del juego:', err);
        this.message = 'Error al cargar el estado del juego';
      }
    });
  }
  
  home(){
    this.router.navigate(['/dashboard']);
  }
  ngOnDestroy(): void {
    if (this.ReadChangeTurnSubscription) {
      this.ReadChangeTurnSubscription.unsubscribe();
    }
  }
}
