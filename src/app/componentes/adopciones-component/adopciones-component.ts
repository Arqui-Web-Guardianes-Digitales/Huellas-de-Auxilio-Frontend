import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { Router, RouterLink } from '@angular/router';

import { Mascota } from '../../model/mascota';
import { MascotaService } from '../../services/mascota-service';
import { AuthService } from '../../services/auth-service';

@Component({
  imports: [RouterLink],
  selector: 'app-adopciones-component',
  templateUrl: './adopciones-component.html',
  styleUrl: './adopciones-component.css',
})
export class AdopcionesComponent implements OnInit {
  private readonly mascotaService = inject(MascotaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  menuAbierto = false;

  mascotas: Mascota[] = [];
  cargando = true;
  error = '';

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      void this.router.navigateByUrl('/login');
      return;
    }

    this.mascotaService.listarDisponibles().subscribe({
      next: (datos) => {
        this.mascotas = datos || [];
        this.cargando = false;
        this.cdr.markForCheck();
      },

      error: () => {
        this.error = 'No se pudo cargar el listado de mascotas.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }
}
