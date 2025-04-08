import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface GameHistory {
  id: number;
  date: string;
  winner_id: number;
  player1_id: number;
  player2_id: number;
  status: string;
  total_moves: number;
  accuracy: number;
  completed_at: string;
}

@Component({
  selector: 'app-game-history',
  templateUrl: './game-history.component.html',
  styleUrls: ['./game-history.component.css'],
  standalone: true,
  imports: [CommonModule, NavbarComponent]
})
export class GameHistoryComponent implements OnInit {
  gameHistory: GameHistory[] = [];
  loading: boolean = true;
  error: string = '';
  currentUserId: number = 0;
  token = localStorage.getItem('token');

  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.fetchCurrentUser();
  }

  fetchCurrentUser(): void {
    this.http.get<any>(`${environment.apiUrl}/user`, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.loadGameHistory();
      },
      error: (err) => {
        console.error('Error getting user ID:', err);
        this.error = 'Error al obtener información del usuario';
        this.loading = false;
      }
    });
  }

  loadGameHistory(): void {
    this.loading = true;
    this.apiService.getGameHistory().subscribe({
      next: (history) => {
        console.log('Current user:', this.currentUserId);
        console.log('Game history:', history);
        this.gameHistory = history;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading game history:', error);
        this.error = 'Error al cargar el historial';
        this.loading = false;
      }
    });
  }
}
