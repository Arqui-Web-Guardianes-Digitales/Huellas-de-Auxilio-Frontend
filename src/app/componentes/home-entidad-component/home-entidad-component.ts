import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-home-entidad-component',
  imports: [RouterLink],
  templateUrl: './home-entidad-component.html',
  styleUrl: './home-entidad-component.css'
})
export class HomeEntidadComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Pantalla de ejemplo: los reportes, métricas y demás módulos aún no están integrados.
  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_ENTIDAD')) {
      this.router.navigateByUrl('/login');
    }
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
