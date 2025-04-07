import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';

import { PusherService } from '../pusher.service';

interface Cell {
  hasShip: boolean;
  isHit: boolean;
  isMiss: boolean;
}

@Component({
  selector: 'app-multiplayer-loading',
  templateUrl: './multiplayer-loading.component.html',
  styleUrls: ['./multiplayer-loading.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MultiplayerLoadingComponent implements OnInit, OnDestroy {
  private gameCreatedSubscription: Subscription = new Subscription();
  private gameJoinedSubscription: Subscription = new Subscription();
  private pollSubscription: Subscription | null = null;

  availableGames: any[] = [];
  loading = false;
  error = '';
  creatingGame = false;
  joiningGame = false;
  waitingForPlayer = false;
  currentGameId: number | null = null;
  message: string | null = null;
  private boardSize = 8;
  private numShips = 15;

  constructor(
    private http: HttpClient,
    private router: Router,
    private pusherService: PusherService
  ) {}

  ngOnInit() {
    this.subscribeToGameCreatedEvents(); // En caso quieras refrescar la lista luego de unirse
    this.loadAvailableGames();
  }

  ngOnDestroy() {
    this.gameCreatedSubscription?.unsubscribe();
    this.gameJoinedSubscription?.unsubscribe();
    this.pollSubscription?.unsubscribe();
  }

  private initializeBoard(): Cell[][] {
    const board: Cell[][] = [];
    for (let i = 0; i < this.boardSize; i++) {
      board[i] = [];
      for (let j = 0; j < this.boardSize; j++) {
        board[i][j] = { hasShip: false, isHit: false, isMiss: false };
      }
    }
    return board;
  }

  private placeShipsRandomly(board: Cell[][]): void {
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

  loadAvailableGames() {
    this.loading = true;
    this.error = '';
    const token = localStorage.getItem('token');

    this.http.get<any[]>(`${environment.apiUrl}/games/available`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (games) => {
        this.availableGames = games;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las partidas disponibles';
        this.loading = false;
        console.error('Error loading games:', err);
      }
    });
  }

  createGame() {
    this.creatingGame = true;
    this.error = '';
    const initialBoard = this.initializeBoard();
    this.placeShipsRandomly(initialBoard);
    const token = localStorage.getItem('token');

    this.http.post<any>(`${environment.apiUrl}/games`, { board: initialBoard }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .subscribe({
      next: (game) => {
        this.currentGameId = game.id;
        this.waitingForPlayer = true;
        this.creatingGame = false;

        this.subscribeToGameJoinedEvents(game.id);
      },
      error: (err) => {
        this.error = 'Error al crear la partida';
        this.creatingGame = false;
        console.error('Error creating game:', err);
      }
    });
  }

  joinGame(gameId: number) {
    this.joiningGame = true;
    this.error = '';
    const token = localStorage.getItem('token');

    this.http.post<any>(`${environment.apiUrl}/games/${gameId}/join`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .subscribe({
      next: (game) => {
        this.router.navigate(['/game', game.id]);
      },
      error: (err) => {
        this.error = 'Error al unirse a la partida';
        this.joiningGame = false;
        console.error('Error joining game:', err);
      }
    });
  }

  private subscribeToGameCreatedEvents() {
    this.gameCreatedSubscription?.unsubscribe();
    this.gameCreatedSubscription = this.pusherService
      .subscribeToChannel('game-channel', 'game.created')
      .subscribe(
        data => {
          console.log('Evento recibido (game.created):', data);
          if (data && data.game?.status === 'waiting') {
            this.availableGames.push(data.game);
          }
        },
        error => {
          console.error('Error de Pusher (game.created):', error);
          this.error = 'Error en la conexión con el servidor de juego';
        }
      );
  }

  private subscribeToGameJoinedEvents(gameId: number) {
    this.gameJoinedSubscription?.unsubscribe();
    this.gameJoinedSubscription = this.pusherService
      .subscribeToChannel('game-channel', `game.${gameId}.join`)
      .subscribe(
        data => {
          if (data?.game) {
            this.availableGames = this.availableGames.filter(game => game.id !== data.game.id);
            if (this.currentGameId === data.game.id) {
              this.router.navigate(['/game', data.game.id]);
            }
          }
        },
        error => {
          console.error('Error en la suscripción al estado del juego:', error);
          this.error = 'Error al verificar el estado de la partida';
        }
      );
  }
}
