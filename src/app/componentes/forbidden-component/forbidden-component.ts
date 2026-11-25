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
<footer class="footer-compacto">
  <div class="footer-compacto-container">
    <div class="footer-compacto-brand">
      <img src="/img/logo-blanco.png" alt="Logo Huellas de Auxilio">
      <p>© 2026 Huellas de Auxilio. Todos<br>los derechos reservados.</p>
    </div>
    <div class="footer-compacto-links">
      <a href="/ayuda">Soporte</a>
      <a href="/documentos/politica-privacidad.pdf" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
      <a href="/documentos/terminos-condiciones.pdf" target="_blank" rel="noopener noreferrer">Términos y condiciones</a>
    </div>
    <div class="footer-social">
      <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><img src="/icons/facebook.png" alt=""></a>
      <a href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="X"><img src="/icons/x.png" alt=""></a>
      <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="/icons/instagram.png" alt=""></a>
    </div>
  </div>
</footer>
  `,
})
export class ForbiddenComponent {
  private readonly auth = inject(AuthService);
  readonly rutaInicio = this.auth.roles().includes('ROLE_ENTIDAD')
    ? '/home-entidad' : this.auth.roles().includes('ROLE_CIUDADANO')
      ? '/home-ciudadano' : '/login';
}
