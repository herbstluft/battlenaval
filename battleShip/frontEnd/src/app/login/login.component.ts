import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string | null = null;
  successMessage: string = '';

 
  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    // Get CSRF token when component initializes
    this.apiService.getCsrfToken().subscribe({
      error: (error) => {
        console.error('Error getting CSRF token:', error);
      }
    });
  }

  onSubmit() {
    const credentials = { email: this.email, password: this.password };

    this.apiService.login(credentials).subscribe({
      next: (response: { message: string; redirectUrl: string; token: string }) => {
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        this.errorMessage = '';
        this.successMessage = response.message;
        setTimeout(() => {
          this.router.navigate([response.redirectUrl]);
        }, 500);
      },
      error: (error) => {
        this.errorMessage = error.error.message || 'Hubo un error al intentar iniciar sesión.';
        console.error('Login error:', error);
      }
    });
  }

  register() {
    this.router.navigate(['/register']);
  }
}
