import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // <-- importa esto
import { environment } from '../../environments/environment';

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
  boardSize = 8;
  myBoard: Cell[][] = [];
  opponentBoard: Cell[][] = [];

  gameId!: number;
  currentTurn!: string; // 'me' or 'opponent'
  message = '';
  token = localStorage.getItem('token');
  playerId!: number; // Para saber si somos player1 o player2


  constructor(private route: ActivatedRoute, private http: HttpClient) {}

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
        console.log(this.playerId);
        // Verificar si el usuario actual es player1 o player2
        const isPlayer1 = this.playerId === data.player1_id;
        const isPlayer2 = this.playerId === data.player2_id;
  
        console.log(isPlayer1);
        // Asignar los tableros correctamente
        if (isPlayer1) {
          this.myBoard = this.initializeBoardFromData(data.myBoard);
          this.opponentBoard = this.initializeBoardFromData(data.opponentBoard);
        } else if (isPlayer2) {
          // Para el jugador 2, los tableros están invertidos
          this.myBoard = this.initializeBoardFromData(data.opponentBoard);
          this.opponentBoard = this.initializeBoardFromData(data.myBoard);
        }
  
        // Determinar de quién es el turno actual
        const isMyTurn = (data.currentTurn === data.player1_id && isPlayer1) || 
                         (data.currentTurn === data.player2_id && isPlayer2);
        this.currentTurn = isMyTurn ? 'me' : 'opponent';
      },
      error: (err) => {
        this.message = 'Error al cargar el estado del juego';
        console.error(err);
      }
    });
  }
  initializeBoardFromData(boardData: any[][]): Cell[][] {
    return boardData.map(row => {
      return row.map(cell => {
        // Verificamos si la celda es null o undefined y asignamos valores predeterminados
        if (!cell) {
          return { hasShip: false, isHit: false, isMiss: false };  // Valores por defecto
        }
  
        // Aseguramos que las propiedades sean válidas
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
      this.message = 'Espera tu turno...';
      return;
    }

    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/attack`, {
      row, col
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (result) => {
        this.message = result.message;
        this.opponentBoard[row][col] = {
          hasShip: false,
          isHit: result.hit,
          isMiss: !result.hit
        };
        this.currentTurn = 'opponent';
      },
      error: (err) => {
        console.error('Error al atacar:', err);
        this.message = 'Error al realizar el ataque';
      }
    });
  }
}
