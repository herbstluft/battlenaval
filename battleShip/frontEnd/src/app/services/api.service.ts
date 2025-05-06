import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Add this interface at the top of the file with the other interfaces
interface PlayerStats {
  victories: number;
  totalGames: number;
  accuracy: number;
}

interface AuthResponse {
    message: string;
    redirectUrl: string;
    token: string;
}

interface ApiResponse<T> {
    message?: string;
    data?: T;
    error?: string;
    redirectUrl?: string;
    token?: string;
}
  
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public apiUrl = 'http://192.168.1.8:8000/api';
  public webUrl = 'http://192.168.1.8:8000/';


  constructor(private http: HttpClient) {}

 private getCsrfTokenFromCookies(): string | null {
   const match = document.cookie.match(/XSRF-TOKEN=([^;]*)/);
   return match ? decodeURIComponent(match[1]) : null;
 }

 /** Obtiene los headers con el token CSRF y el Bearer Token */
 private getHeaders(): HttpHeaders {
   const token = localStorage.getItem('token');
   const csrfToken = this.getCsrfTokenFromCookies();

   return new HttpHeaders({
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${token}`,
     'X-XSRF-TOKEN': csrfToken || '' // Asegurar que siempre se envía algo
   });
 }

 /** Obtiene la cookie CSRF desde Laravel */
 getCsrfToken(): Observable<any> {
   return this.http.get(`${this.apiUrl}/sanctum/csrf-cookie`, { withCredentials: true });
 }

 /** Inicia sesión en la API */
 login(credentials: {email: string, password: string}): Observable<any> {
   return this.http.post(`${this.apiUrl}/login`, credentials, {
     headers: this.getHeaders(),
     withCredentials: true // Necesario para enviar cookies
   });
 }

  
  registerUser(userData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/register`, userData, { withCredentials: true });
  }
  verifyCode(code: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/verify-code`, { code }, { withCredentials: true });
  }

  createGame(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/games`,
      {},
      { headers: this.getHeaders(), withCredentials: true } // Importante: `withCredentials: true`
    );
  }
  

  // Método para unirse a una partida existente
  joinGame(gameId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.webUrl}/games/join/${gameId}`, {}, { headers: this.getHeaders() });
  }

  // Método para obtener las partidas disponibles
  getAvailableGames(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/games/available`, { headers: this.getHeaders() });
  }

  // Método para verificar el estado de una partida
  checkGameStatus(gameId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/games/${gameId}/status`, { headers: this.getHeaders() });
  }

  getPlayerStats(): Observable<PlayerStats> {
    return this.http.get<PlayerStats>(`${this.apiUrl}/user/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  }
  
  // Add this method to the ApiService class
  getGameHistory(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/games-history`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  }

  getGameDetails(gameId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/games/${gameId}/details`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  }

  getCurrentUser() {
    return this.http.get<any>(`${this.apiUrl}/user`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  }
}