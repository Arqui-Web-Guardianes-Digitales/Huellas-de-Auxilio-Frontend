import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-home-ciudadano-component',
  imports: [RouterLink],
  templateUrl: './home-ciudadano-component.html',
  styleUrl: './home-ciudadano-component.css'
})
export class HomeCiudadanoComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Pantalla de ejemplo: los reportes, métricas y demás módulos aún no están integrados.
  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
    }
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
