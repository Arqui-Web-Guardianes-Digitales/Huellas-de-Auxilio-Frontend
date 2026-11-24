import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth-service';

// Adaptado del interceptor visto en clase. Solo enviamos el JWT a nuestra API,
// nunca a servicios externos (mapas, imágenes, etc.).
export const loginInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const api = environment.apiURL.replace(/\/$/, '');
  const esApi = req.url === api || req.url.startsWith(`${api}/`);
  const ruta = esApi ? req.url.slice(api.length) : '';

  // Login y creación de las dos cuentas deben funcionar sin token.
  const esPublica = req.method === 'POST' &&
    ['/authenticate', '/usuario', '/ciudadano', '/entidad'].includes(ruta);

  const token = auth.token();
  const peticion = esApi && !esPublica && token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (esApi && !esPublica && error instanceof HttpErrorResponse) {
        if (error.status === HttpStatusCode.Unauthorized) {
          auth.cerrarSesion();
          void router.navigateByUrl('/login');
        } else if (error.status === HttpStatusCode.Forbidden) {
          void router.navigateByUrl('/forbidden');
        }
      }
      // Propagar el error para que el componente termine su estado de carga.
      return throwError(() => error);
    })
  );
};
