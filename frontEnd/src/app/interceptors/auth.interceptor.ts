import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserStatusService } from '../services/user-status.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private userStatusService: UserStatusService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    request = request.clone({
      withCredentials: true,
      headers: request.headers.set('X-Requested-With', 'XMLHttpRequest')
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.userStatusService.checkUserStatus().subscribe();
        }
        return throwError(() => error);
      })
    );
}