import { HttpInterceptorFn, HttpHandlerFn, HttpRequest } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Obtener el token del almacenamiento local
  const token = localStorage.getItem('auth_token');

  if (token) {
    // Clonar la solicitud y agregar el token en el encabezado
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};