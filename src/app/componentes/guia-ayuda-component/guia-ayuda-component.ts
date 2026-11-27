import { AuthService } from '../../services/auth-service';
import { Router, RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';

@Component({
  imports: [RouterLink],
  selector: 'app-guia-ayuda-component',
  styleUrl: './guia-ayuda-component.css',
  templateUrl: './guia-ayuda-component.html',
})
export class GuiaAyudaComponent {
  get esEntidad(): boolean { return this.auth.roles().includes('ROLE_ENTIDAD'); }
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }
  get nombrePerfil(): string {
    return this.esEntidad ? sessionStorage.getItem('nombreEntidad') || 'Mi cuenta' : this.auth.nombreCiudadano();
  }
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  menuAbierto = false;
}
