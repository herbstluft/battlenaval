import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { FormsModule } from '@angular/forms';



interface PlayerStats {
  victories: number;
  totalGames: number;
  accuracy: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule]
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading: boolean = true;
  error: string = '';
  playerStats: PlayerStats = {
    victories: 0,
    totalGames: 0,
    accuracy: 0
  };

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.loadPlayerStats();
  }


  ngOnDestroy(): void {
  }

  startGame(): void {
    this.router.navigate(['/multiplayer-loading']);
  }

  loadPlayerStats(): void {
    // Aquí implementaremos la carga de estadísticas del jugador
   /*  this.apiService.getPlayerStats().subscribe({
      next: (stats: PlayerStats) => {
        this.playerStats = stats;
        this.loading = false;
      },
      error: (error: Error) => {
        console.error('Error loading player stats:', error);
        this.error = 'Error al cargar las estadísticas';
        this.loading = false;
      }
    }); */
  }

  //loadUserTasks(): void {
    //this.loading = true;
   /*  this.apiService.getUserTasks().subscribe({
      next: (response: any) => {
        this.userTasks = response.tasks;
        this.loadAllComments();
        this.loading = false;
      },
      error: (error: Error) => {
        this.error = 'Error al cargar las tareas';
        this.loading = false;
        console.error('Error:', error);
      }
    }); */
 // }

}
