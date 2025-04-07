import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // <-- importa esto
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
  imports: [CommonModule], // <-- agrégalo aquí
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css'],
  standalone: true,
})
export class GameBoardComponent implements OnInit {

  private ReadChangeTurnSubscription: Subscription = new Subscription();


  boardSize = 8;
  myBoard: Cell[][] = [];
  opponentBoard: Cell[][] = [];

  gameId!: number;
  currentTurn!: string; // 'me' or 'opponent'
  message = '';
  error = '';
  token = localStorage.getItem('token');
  playerId!: number; // Para saber si somos player1 o player2


  constructor(private route: ActivatedRoute, private http: HttpClient, private pusherService: PusherService  ) {}

  ngOnInit(): void {
    this.gameId = Number(this.route.snapshot.paramMap.get('id'));
    this.initializeBoards();
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
  
  initializeBoards(): void {
    this.myBoard = this.createEmptyBoard();
    this.opponentBoard = this.createEmptyBoard();
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

  // Remove the duplicate attackCell method and keep only this one
  attackCell(row: number, col: number): void {
    if (this.currentTurn !== 'me') {
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
        
        // Show hit/miss message immediately
        if (response.hit) {
          this.message = '¡Le diste a un barco! 🎯';
        } else {
          this.message = 'Agua... 💦';
        }
  
        // Update the local board immediately for feedback
        if (response.hit) {
          this.opponentBoard[row][col].isHit = true;
          this.opponentBoard[row][col].hasShip = true;
        } else {
          this.opponentBoard[row][col].isMiss = true;
        }
        
        // The complete board update will come through Pusher
      },
      error: (err) => {
        console.error('Error al atacar:', err);
        this.message = err.error?.message || 'Error en el ataque';
      }
    });
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
  
        // For opponent's board, only show hits and misses
        if (isOpponentBoard) {
          return {
            hasShip: cell.isHit ? cell.hasShip : false, // Only show ship if hit
            isHit: Boolean(cell.isHit),
            isMiss: Boolean(cell.isMiss)
          };
        }
        
        // For my board, show everything
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
 
}
