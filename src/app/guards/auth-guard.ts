import { Injectable, inject, isDevMode } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth-service';

// Guard como el de clase, adaptado a las rutas y roles de Huellas de Auxilio.
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.auth.sesionVigente()) {
      if (isDevMode()) console.warn('[Guard] Acceso denegado: inicia sesión.');
      this.auth.cerrarSesion();
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const requeridos = route.data['roles'] as string[] | undefined;
    if (requeridos?.length && !requeridos.some((rol) => this.auth.roles().includes(rol))) {
      if (isDevMode()) console.warn('[Guard] Acceso denegado: rol no autorizado.');
      return this.router.createUrlTree(['/forbidden']);
    }
    return true;
  }
}
