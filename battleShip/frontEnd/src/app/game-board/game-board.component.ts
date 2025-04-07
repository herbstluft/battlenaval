import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { PusherService } from '../pusher.service';
import { Subscription } from 'rxjs';

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


  boardSize = 8;
  myBoard: Cell[][] = [];
  opponentBoard: Cell[][] = [];
  isGameOver = false; // Add this property
  gameStats = {
    totalShots: 0,
    hits: 0,
    misses: 0,
    winner: ''
  };

  gameId!: number;
  currentTurn!: string; // 'me' or 'opponent'
  message = '';
  error = '';
  token = localStorage.getItem('token');
  playerId!: number; // Para saber si somos player1 o player2


  constructor(private route: ActivatedRoute, private http: HttpClient, private pusherService: PusherService  ) {}

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
          
        this.fetchGameState();  // Llamar a fetchGameState solo después de obtener el playerId
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
      this.message = 'No es tu turno';
      return;
    }
  
    if (this.opponentBoard[row][col].isHit || this.opponentBoard[row][col].isMiss) {
      this.message = 'Ya atacaste esta celda';
      return;
    }
  
    console.log(`Attacking position: row ${row}, col ${col}`);
    
    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/attack`, {
      row: row,
      col: col,
      playerId: this.playerId,
      gameId: this.gameId
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (response) => {
        console.log('Attack response:', response);
        
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
      this.message = '¡Felicitaciones! Has ganado el juego! 🎉';
    }
  }

  // Modify updateBoards to check for game over when receiving updates
  private updateBoards(gameData: any): void {
    if (!gameData) {
      console.error('Game data is undefined');
      return;
    }
  
    const isPlayer1 = this.playerId === gameData.player1_id;
    
    // Keep existing board if new data doesn't include board information
    if (gameData.myBoard && gameData.opponentBoard) {
      console.log('Board update - Player:', this.playerId, 'Is Player1:', isPlayer1);
      console.log('My board data:', gameData.myBoard);
      console.log('Opponent board data:', gameData.opponentBoard);
  
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
      console.log('Turn updated:', this.currentTurn, 'Current player:', this.playerId, 'Turn ID:', turnId);
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
  
  ngOnDestroy(): void {
    if (this.ReadChangeTurnSubscription) {
      this.ReadChangeTurnSubscription.unsubscribe();
    }
  }
}
