import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';

interface Cell {
  hasShip: boolean;
  isHit: boolean;
  isMiss: boolean;
}

interface GameMove {
  row: number;
  col: number;
  isHit: boolean;
}

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class GameBoardComponent implements OnInit, OnDestroy {
  boardSize = 8;
  numShips = 15;
  playerBoard: Cell[][] = [];
  opponentBoard: Cell[][] = [];
  isMyTurn = true; // Inicializar como true para permitir al jugador atacar primero
  gameId: string | null = null;
  playerId: string | null = null;
  gameStatus: string = 'waiting';
  gameSubscription: Subscription | null = null;
  pollingSubscription: Subscription | null = null;
  gameOver: boolean = false;
  winner: string | null = null;
  message: string = 'Esperando al oponente...';
  pollingInterval = 3000; // Intervalo de polling en milisegundos
  isPolling = true; // Control para detener el polling

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private apiService: ApiService
  ) {
    this.initializeBoards();
  }

  ngOnInit(): void {
    // Obtener el ID del juego de la URL
    this.route.paramMap.subscribe(params => {
      this.gameId = params.get('id');
      if (this.gameId) {
        this.loadGameState();
        // El polling se inicia en loadGameState
      }
    });
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones al destruir el componente
    this.isPolling = false;
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.gameSubscription) {
      this.gameSubscription.unsubscribe();
    }
  }

  loadGameState(): void {
    const token = localStorage.getItem('token');
    
    this.http.get<any>(`${environment.apiUrl}/games/${this.gameId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (gameData) => {
        // Actualizar el estado del juego con los datos del servidor
        this.playerId = gameData.player_id;
        // Siempre permitir que el jugador ataque primero
        this.isMyTurn = true;
        
        // Cargar el tablero del jugador
        if (gameData.player_board) {
          this.playerBoard = gameData.player_board;
        } else {
          this.placeShipsRandomly(this.playerBoard);
          this.savePlayerBoard();
        }
        
        // Inicializar el tablero del oponente
        // Asegurarse de que el tablero del oponente tenga barcos para que la interacción funcione
        this.placeShipsRandomly(this.opponentBoard);
        
        // Aplicar movimientos previos del oponente si existen
        if (gameData.opponent_moves) {
          this.applyOpponentMoves(gameData.opponent_moves);
        }
        
        // Actualizar el estado del juego
        this.gameStatus = gameData.status;
        this.message = 'Tu turno - ¡Ataca a tu oponente!';
        
        // Iniciar el polling para verificar movimientos del oponente
        this.startPolling();
      },
      error: (err) => {
        console.error('Error al cargar el estado del juego:', err);
        this.message = 'Error al cargar el juego';
      }
    });
  }

  initializeBoards(): void {
    for (let i = 0; i < this.boardSize; i++) {
      this.playerBoard[i] = [];
      this.opponentBoard[i] = [];
      for (let j = 0; j < this.boardSize; j++) {
        this.playerBoard[i][j] = { hasShip: false, isHit: false, isMiss: false };
        this.opponentBoard[i][j] = { hasShip: false, isHit: false, isMiss: false };
      }
    }
  }

  initializeOpponentBoard(opponentShips?: {row: number, col: number}[]): void {
    // Si recibimos la posición de los barcos del oponente, los colocamos
    if (opponentShips && opponentShips.length > 0) {
      opponentShips.forEach(ship => {
        if (ship.row >= 0 && ship.row < this.boardSize && 
            ship.col >= 0 && ship.col < this.boardSize) {
          this.opponentBoard[ship.row][ship.col].hasShip = true;
        }
      });
    } else {
      // Si no recibimos la posición de los barcos, los colocamos aleatoriamente
      // Esto es solo para pruebas, en un juego real el servidor debe enviar las posiciones
      this.placeShipsRandomly(this.opponentBoard);
    }
  }

  savePlayerBoard(): void {
    const token = localStorage.getItem('token');
    
    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/board`, {
      board: this.playerBoard
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: () => console.log('Tablero guardado correctamente'),
      error: (err) => console.error('Error al guardar el tablero:', err)
    });
  }

  startPolling(): void {
    if (!this.gameId) return;
    
    // Usar interval para hacer polling al servidor cada X segundos
    this.pollingSubscription = interval(this.pollingInterval)
      .pipe(takeWhile(() => this.isPolling && !this.gameOver))
      .subscribe(() => {
        this.checkGameUpdates();
      });
  }
  
  checkGameUpdates(): void {
    const token = localStorage.getItem('token');
    
    this.http.get<any>(`${environment.apiUrl}/games/${this.gameId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        console.log('Actualización del juego recibida:', data);
        
        // Verificar si hay nuevos movimientos del oponente
        if (data.opponent_moves && data.opponent_moves.length > 0) {
          // Obtener el último movimiento que no hayamos procesado
          const lastProcessedMoveIndex = this.getLastProcessedMoveIndex();
          const newMoves = data.opponent_moves.slice(lastProcessedMoveIndex + 1);
          
          // Procesar nuevos movimientos
          newMoves.forEach((move: GameMove) => {
            this.handleOpponentMove(move);
          });
        }
        
        // Verificar si el juego ha terminado
        if (data.status === 'finished') {
          this.gameOver = true;
          this.winner = data.winner === this.playerId ? 'Tú' : 'Oponente';
          this.message = this.winner === 'Tú' ? '¡Has ganado!' : 'Has perdido';
          this.isPolling = false; // Detener el polling
        }
      },
      error: (err) => console.error('Error al verificar actualizaciones del juego:', err)
    });
  }
  
  getLastProcessedMoveIndex(): number {
    // Contar cuántas celdas del tablero del jugador han sido atacadas
    let attackedCells = 0;
    for (let i = 0; i < this.boardSize; i++) {
      for (let j = 0; j < this.boardSize; j++) {
        if (this.playerBoard[i][j].isHit || this.playerBoard[i][j].isMiss) {
          attackedCells++;
        }
      }
    }
    return attackedCells - 1; // -1 porque los índices empiezan en 0
  }

  placeShipsRandomly(board: Cell[][]): void {
    let shipsPlaced = 0;
    while (shipsPlaced < this.numShips) {
      const row = Math.floor(Math.random() * this.boardSize);
      const col = Math.floor(Math.random() * this.boardSize);
      if (!board[row][col].hasShip) {
        board[row][col].hasShip = true;
        shipsPlaced++;
      }
    }
  }

  onCellClick(row: number, col: number, isOpponentBoard: boolean): void {
    // Verificar si es el turno del jugador y si está haciendo clic en el tablero del oponente
    if (!this.isMyTurn || !isOpponentBoard || this.gameOver) return;
    
    const cell = this.opponentBoard[row][col];
    // Verificar si la celda ya ha sido atacada
    if (cell.isHit || cell.isMiss) return;

    // Marcar la celda como atacada (siempre como fallo inicialmente)
    // El servidor determinará si realmente hay un barco y actualizará el estado
    cell.isMiss = true;

    // Cambiar el turno temporalmente hasta recibir confirmación del servidor
    this.isMyTurn = false;
    this.message = 'Enviando movimiento...'
    
    // Enviar el movimiento al servidor
    this.sendMove(row, col);
  }

  sendMove(row: number, col: number): void {
    const token = localStorage.getItem('token');
    
    this.http.post<any>(`${environment.apiUrl}/games/${this.gameId}/move`, {
      row: row,
      col: col
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (response) => {
        console.log('Movimiento enviado correctamente:', response);
        
        // Actualizar el estado de la celda según la respuesta del servidor
        const cell = this.opponentBoard[row][col];
        if (response.hit) {
          cell.isHit = true;
          cell.isMiss = false;
        } else {
          cell.isHit = false;
          cell.isMiss = true;
        }
        
        // Verificar si el jugador ha ganado
        if (response.game_over && response.winner === this.playerId) {
          this.gameOver = true;
          this.winner = 'Tú';
          this.message = '¡Has ganado!';
          this.isPolling = false; // Detener el polling
        } else {
          // Esperar un breve momento y luego permitir al jugador atacar de nuevo
          setTimeout(() => {
            this.isMyTurn = true;
            this.message = 'Tu turno - ¡Ataca de nuevo!';
          }, 500);
        }
      },
      error: (err) => {
        console.error('Error al enviar el movimiento:', err);
        // Revertir el movimiento en caso de error
        const cell = this.opponentBoard[row][col];
        cell.isHit = false;
        cell.isMiss = false;
        this.isMyTurn = true;
        this.message = 'Error al enviar el movimiento. Inténtalo de nuevo.';
      }
    });
  }

  handleOpponentMove(move: GameMove): void {
    // Aplicar el movimiento del oponente en el tablero del jugador
    const cell = this.playerBoard[move.row][move.col];
    
    if (cell.hasShip) {
      cell.isHit = true;
    } else {
      cell.isMiss = true;
    }
    
    // Siempre mantener el turno del jugador
    this.isMyTurn = true;
    this.message = 'Tu turno - ¡Ataca a tu oponente!';
    
    // Verificar si el juego ha terminado
    this.checkGameOver();
  }

  applyOpponentMoves(moves: GameMove[]): void {
    // Aplicar todos los movimientos previos del oponente
    moves.forEach(move => {
      const cell = this.playerBoard[move.row][move.col];
      if (move.isHit) {
        cell.isHit = true;
      } else {
        cell.isMiss = true;
      }
    });
  }

  checkGameOver(): void {
    // Verificar si todos los barcos del jugador han sido hundidos
    let allPlayerShipsSunk = true;
    for (let i = 0; i < this.boardSize; i++) {
      for (let j = 0; j < this.boardSize; j++) {
        if (this.playerBoard[i][j].hasShip && !this.playerBoard[i][j].isHit) {
          allPlayerShipsSunk = false;
          break;
        }
      }
      if (!allPlayerShipsSunk) break;
    }
    
    // Verificar si todos los barcos del oponente han sido hundidos
    let allOpponentShipsSunk = true;
    for (let i = 0; i < this.boardSize; i++) {
      for (let j = 0; j < this.boardSize; j++) {
        if (this.opponentBoard[i][j].hasShip && !this.opponentBoard[i][j].isHit) {
          allOpponentShipsSunk = false;
          break;
        }
      }
      if (!allOpponentShipsSunk) break;
    }
    
    // Actualizar el estado del juego si ha terminado
    if (allPlayerShipsSunk || allOpponentShipsSunk) {
      this.gameOver = true;
      this.winner = allOpponentShipsSunk ? 'Tú' : 'Oponente';
      this.message = allOpponentShipsSunk ? '¡Has ganado!' : 'Has perdido';
    }
  }
}