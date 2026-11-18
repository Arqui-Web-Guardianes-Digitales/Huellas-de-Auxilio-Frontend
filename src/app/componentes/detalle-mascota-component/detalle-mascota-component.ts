import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Mascota } from '../../model/mascota';
import { Entidad } from '../../model/entidad';
import { MascotaService } from '../../services/mascota-service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-detalle-mascota-component',
  imports: [RouterLink],
  templateUrl: './detalle-mascota-component.html',
  styleUrl: './detalle-mascota-component.css',
})
export class DetalleMascotaComponent implements OnInit {
  urlFotoMascota(url?: string | null): string {
    return this.mascotaService.urlFotoMascota(url);
  }

  mostrarFotoDeRespaldo(evento: Event): void {
    this.mascotaService.mostrarFotoDeRespaldo(evento);
  }

  private readonly mascotaService = inject(MascotaService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  mascota: Mascota | null = null;
  entidad: Entidad | null = null;

  cargando = true;
  error = '';
  errorEntidad = '';

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      void this.router.navigateByUrl('/login');
      return;
    }

    const idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));

    if (!Number.isSafeInteger(idMascota) || idMascota <= 0) {
      this.error = 'El identificador de la mascota no es válido.';
      this.cargando = false;
      return;
    }

    this.mascotaService.buscarPorId(idMascota).subscribe({
      next: (mascota) => {
        this.cargando = false;

        if (!mascota) {
          this.error = 'No se encontró la mascota.';
          this.cdr.markForCheck();
          return;
        }

        this.mascota = mascota;

        if (mascota.entidadIdEntidad) {
          this.cargarEntidad(mascota.entidadIdEntidad);
        }

        this.cdr.markForCheck();
      },

      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error =
          e.status === 0
            ? 'No se pudo conectar con el backend.'
            : 'No se pudo cargar el detalle de la mascota.';

        this.cdr.markForCheck();
      },
    });
  }

  cargarEntidad(idEntidad: number): void {
    this.mascotaService.buscarEntidadPorId(idEntidad).subscribe({
      next: (entidad) => {
        this.entidad = entidad;

        if (!entidad) {
          this.errorEntidad = 'No se encontró la información de la entidad.';
        }

        this.cdr.markForCheck();
      },

      error: () => {
        this.errorEntidad = 'No se pudo cargar la información de la entidad.';

        this.cdr.markForCheck();
      },
    });
  }
}
