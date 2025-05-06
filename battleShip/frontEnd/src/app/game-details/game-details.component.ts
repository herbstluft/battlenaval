import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { Router } from '@angular/router';


interface GameDetails {
  id: number;
  date: string;
  winner_id: number;
  player1_id: number;
  player2_id: number;
  status: string;
  total_moves: number;
  accuracy: number;
  completed_at: string;
  hits: number;
  misses: number;
  is_winner: boolean;
  player_role: string;
  attacks?: Attack[];
}

interface Attack {
  _id: string;
  row: number;
  col: number;
  is_hit: boolean;
  turn_number: number;
  created_at: string;
  attacker_id: number;
  attacker?: {
    id: number;
    name: string;
  };
}

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterModule],
  templateUrl: './game-details.component.html',
  styleUrls: ['./game-details.component.css']
})
export class GameDetailsComponent implements OnInit {
  gameId!: number;
  gameDetails: GameDetails | null = null;
  loading = true;
  error = '';
  private userId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // First get the user ID
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.getCurrentUser().subscribe({
      next: (user) => {
        this.userId = user.id;
        this.gameId = Number(this.route.snapshot.paramMap.get('id'));
        this.loadGameDetails();
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  loadGameDetails(): void {
    this.loading = true;
    this.apiService.getGameDetails(this.gameId).subscribe({
      next: (details) => {
        // Check if user is a participant
        if (this.userId !== details.player1_id && this.userId !== details.player2_id) {
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/game-history']);
          }, 2000);
          return;
        }

        // Reset statistics before calculating
        details.total_moves = 0;
        details.hits = 0;
        details.misses = 0;
        details.accuracy = 0;

        // Calculate statistics only if attacks exist
        if (details.attacks && Array.isArray(details.attacks)) {
          // Filter attacks for the current player only
          const playerAttacks = details.attacks.filter((attack: Attack) => 
            attack.attacker_id === (details.player_role === 'player1' ? details.player1_id : details.player2_id)
          );
          
          // Calculate statistics from filtered attacks
          details.total_moves = playerAttacks.length;
          details.hits = playerAttacks.filter((attack: Attack) => attack.is_hit).length;
          details.misses = details.total_moves - details.hits;
          details.accuracy = details.total_moves > 0 
            ? Math.round((details.hits / details.total_moves) * 100) 
            : 0;
        }

        this.gameDetails = details;
        this.loading = false;
      },
      error: (error) => {
        this.router.navigate(['/game-history']);
        this.loading = false;
      }
    });
  }
}
