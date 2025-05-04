import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserStatusService {
  private apiUrl = 'http://localhost:8000/api';
  private userActiveSubject = new BehaviorSubject<boolean>(true);
  public userActive$ = this.userActiveSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Iniciar verificación periódica del estado del usuario
    this.startUserStatusCheck();
  }

  private startUserStatusCheck() {
    interval(30000).subscribe(() => { // Verificar cada 30 segundos
      this.checkUserStatus().subscribe();
    });
  }

  public checkUserStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/status`).pipe(
      tap(() => this.userActiveSubject.next(true)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.handleInactiveUser();
        }
        throw error;
      })
    );
  }

  private handleInactiveUser() {
    this.userActiveSubject.next(false);
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  public isUserActive(): boolean {
    return this.userActiveSubject.value;
  }
}