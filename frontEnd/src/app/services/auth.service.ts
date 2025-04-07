import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getCsrfToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sanctum/csrf-cookie`);
  }

  login(credentials: {email: string, password: string}): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true }))
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {});
  }
}