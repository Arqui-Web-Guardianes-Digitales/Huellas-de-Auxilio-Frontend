import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-forbidden-component',
  imports: [RouterLink],
  template: `
    <main style="max-width:620px;margin:9vh auto;padding:24px;text-align:center;font-family:inherit">
      <h1>Acceso no permitido</h1>
      <p>Tu cuenta no tiene permisos para acceder a esta página.</p>
      <a [routerLink]="rutaInicio">Regresar a mi inicio</a>
    </main>
  `,
})
export class ForbiddenComponent {
  private readonly auth = inject(AuthService);
  readonly rutaInicio = this.auth.roles().includes('ROLE_ENTIDAD')
    ? '/home-entidad' : this.auth.roles().includes('ROLE_CIUDADANO')
      ? '/home-ciudadano' : '/login';
}
