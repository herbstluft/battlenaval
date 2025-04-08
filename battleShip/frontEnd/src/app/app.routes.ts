import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { RegisterComponent } from './register/register.component';
import { ActivateaccountComponent } from './activateaccount/activateaccount.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GameBoardComponent } from './game-board/game-board.component';
import { MultiplayerLoadingComponent } from './multiplayer-loading/multiplayer-loading.component';

export const routes: Routes = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'activateAccount', component: ActivateaccountComponent },
    

  { path: 'dashboard', component: DashboardComponent },
  { path: 'game/:id', component: GameBoardComponent },
  { path: 'multiplayer-loading', component: MultiplayerLoadingComponent },
  // Add this to your routes array
  {
    path: 'game-history',
    loadComponent: () => import('./game-history/game-history.component')
      .then(m => m.GameHistoryComponent)
  }
];
