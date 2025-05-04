import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { UserStatusService } from './user-status.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private userStatusService: UserStatusService
  ) {}

  getCsrfToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sanctum/csrf-cookie`);
  }

  login(credentials: {email: string, password: string}): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true })),
      tap(() => this.userStatusService.checkUserStatus().subscribe())
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('user');
        this.userStatusService.checkUserStatus().subscribe();
      })
    );
  }

  checkAuthStatus(): Observable<any> {
    return this.userStatusService.checkUserStatus();
  }
}