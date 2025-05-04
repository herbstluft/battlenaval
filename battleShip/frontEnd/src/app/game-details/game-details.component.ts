import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NavbarComponent } from '../navbar/navbar.component';

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
  attacks?: {
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
  }[];
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

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.gameId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadGameDetails();
  }

  loadGameDetails(): void {
    this.loading = true;
    this.apiService.getGameDetails(this.gameId).subscribe({
      next: (details) => {
        // Calculate total moves and accuracy from attacks
        if (details.attacks) {
          const playerAttacks = details.attacks.filter((attack: { attacker_id: number }) => 
            attack.attacker_id === (details.player_role === 'player1' ? details.player1_id : details.player2_id)
          );
          
          details.total_moves = playerAttacks.length;
          details.hits = playerAttacks.filter((attack: { is_hit: boolean }) => attack.is_hit).length;
          details.misses = playerAttacks.filter((attack: { is_hit: boolean }) => !attack.is_hit).length;
          details.accuracy = details.total_moves > 0 
            ? (details.hits / details.total_moves) * 100 
            : 0;
        }

        this.gameDetails = details;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading game details:', error);
        this.error = 'Error al cargar los detalles de la partida';
        this.loading = false;
      }
    });
  }
}
