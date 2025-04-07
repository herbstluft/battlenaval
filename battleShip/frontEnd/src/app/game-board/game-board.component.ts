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
  fetchGameState(): void {
    this.http.get<any>(`${environment.apiUrl}/games/${this.gameId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (data) => {
        this.updateGameState(data);
      },
      error: (err) => {
        console.error('Error al cargar el estado del juego:', err);
        this.message = 'Error al cargar el estado del juego';
      }
    });
  }
  private initializeBoardFromData(boardData: any[][], isOpponentBoard = false): Cell[][] {
    return boardData.map(row => {
      return row.map(cell => {
        // Para el tablero del oponente, no mostrar barcos no golpeados
        if (isOpponentBoard && !cell.isHit) {
          return {
            hasShip: false, // Ocultar barcos del oponente
            isHit: cell.isHit,
            isMiss: cell.isMiss
          };
        }
        
        return {
          hasShip: cell.hasShip ?? false,
          isHit: cell.isHit ?? false,
          isMiss: cell.isMiss ?? false
        };
      });
    });
  }
  
  attackCell(row: number, col: number): void {
    if (this.currentTurn !== 'me') {
      this.message = 'No es tu turno';
      return;
    }
  
    if (this.opponentBoard[row][col].isHit || this.opponentBoard[row][col].isMiss) {
      this.message = 'Ya atacaste esta celda';
      return;
    }
  
    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/attack`, {
      row, col
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (response) => {
        this.message = response.message;
        // La actualización real vendrá por Pusher
      },
      error: (err) => {
        console.error('Error al atacar:', err);
        this.message = err.error?.message || 'Error en el ataque';
      }
    });
  }
private subscribeToGameReadChangeTurn() {
  this.ReadChangeTurnSubscription?.unsubscribe();
  this.ReadChangeTurnSubscription = this.pusherService
    .subscribeToChannel('game-channel', 'game.changeTurn')
    .subscribe(
      (data: any) => {
        
        console.log('Evento changeTurn recibido:', data);
        
        // Verificar si el juego es para nosotros
        if (data.game.id === this.gameId) {
          // Determinar de quién es el turno
          const isMyTurn = data.game.currentTurn === this.playerId;
          this.currentTurn = isMyTurn ? 'me' : 'opponent';
          
          console.log(`Soy jugador ${this.playerId}, turno actual: ${data.game.currentTurn}, mi turno?: ${isMyTurn}`);
          
          // Actualizar ambos tableros
          this.updateBoards(data.game);
        }
      },
      error => {
        console.error('Error en Pusher:', error);
        this.error = 'Error de conexión con el servidor';
      }
    );
}

private updateBoards(gameData: any): void {
  const isPlayer1 = this.playerId === gameData.player1_id;
  
  // Actualizar mi tablero
  this.myBoard = this.initializeBoardFromData(
    isPlayer1 ? gameData.player1_board : gameData.player2_board
  );
  
  // Actualizar tablero del oponente (solo muestra hits/misses, no barcos)
  this.opponentBoard = this.initializeBoardFromData(
    isPlayer1 ? gameData.player2_board : gameData.player1_board
  );
  
  this.message = gameData.message || '';
}

private updateGameState(gameData: any): void {
  // Determinar si somos player1 o player2
  const isPlayer1 = this.playerId === gameData.player1_id;
  const isPlayer2 = this.playerId === gameData.player2_id;

  // Actualizar los tableros según corresponda
  if (isPlayer1) {
    this.myBoard = this.initializeBoardFromData(gameData.player1_board || gameData.myBoard);
    this.opponentBoard = this.initializeBoardFromData(gameData.player2_board || gameData.opponentBoard);
  } else if (isPlayer2) {
    this.myBoard = this.initializeBoardFromData(gameData.player2_board || gameData.opponentBoard);
    this.opponentBoard = this.initializeBoardFromData(gameData.player1_board || gameData.myBoard);
  }

  // Actualizar el turno
  this.currentTurn = gameData.currentTurn === this.playerId ? 'me' : 'opponent';
  
  // Actualizar mensajes u otros estados si es necesario
  this.message = gameData.message || '';
}
}
