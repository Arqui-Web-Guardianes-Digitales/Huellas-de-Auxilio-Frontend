import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
export class DetalleMascotaComponent implements OnInit, OnDestroy {
  menuMobileAbierto = false;
  get nombreUsuario(): string { return this.auth.nombreCiudadano(); }
  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }
  urlFotoMascota(url?: string | null): string {
    return this.mascotaService.urlFotoMascota(url);
  }

  mostrarFotoDeRespaldo(evento: Event): void {
    console.warn(
      '[DetalleMascotaComponent] No se pudo cargar la foto; se usará la imagen de respaldo.',
    );
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
    console.log('[DetalleMascotaComponent] Entrada al componente.');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.warn('[DetalleMascotaComponent] Acceso no autorizado; se solicita volver al login.');
      void this.router.navigateByUrl('/login');
      return;
    }

    const idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));

    if (!Number.isSafeInteger(idMascota) || idMascota <= 0) {
      console.warn(
        '[DetalleMascotaComponent] Validación fallida: identificador de mascota no válido.',
      );
      this.error = 'El identificador de la mascota no es válido.';
      this.cargando = false;
      return;
    }

    console.log('[DetalleMascotaComponent] Consulta de mascota iniciada.', { idMascota });
    this.mascotaService.buscarPorId(idMascota).subscribe({
      next: (mascota) => {
        this.cargando = false;

        if (!mascota) {
          console.warn('[DetalleMascotaComponent] La API no devolvió una mascota.', { idMascota });
          this.error = 'No se encontró la mascota.';
          this.cdr.markForCheck();
          return;
        }

        this.mascota = mascota;
        console.log('[DetalleMascotaComponent] Mascota recibida.', {
          idMascota: mascota.idMascota,
          disponible: mascota.estado,
        });

        if (mascota.entidadIdEntidad) {
          this.cargarEntidad(mascota.entidadIdEntidad);
        }

        this.cdr.markForCheck();
      },

      error: (e: HttpErrorResponse) => {
        console.error('[DetalleMascotaComponent] Error al consultar la mascota.', {
          estadoHttp: e.status,
        });
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
    console.log('[DetalleMascotaComponent] Consulta de entidad iniciada.', { idEntidad });
    this.mascotaService.buscarEntidadPorId(idEntidad).subscribe({
      next: (entidad) => {
        this.entidad = entidad;
        if (entidad) {
          console.log('[DetalleMascotaComponent] Entidad recibida.', { idEntidad });
        } else {
          console.warn('[DetalleMascotaComponent] La API no devolvió una entidad.', { idEntidad });
        }

        if (!entidad) {
          this.errorEntidad = 'No se encontró la información de la entidad.';
        }

        this.cdr.markForCheck();
      },

      error: () => {
        console.error('[DetalleMascotaComponent] Error al consultar la entidad.', { idEntidad });
        this.errorEntidad = 'No se pudo cargar la información de la entidad.';

        this.cdr.markForCheck();
      },
    });
  }

  registrarNavegacion(destino: string | (string | number)[]): void {
    console.log('[DetalleMascotaComponent] Navegación solicitada.', { destino });
  }

  ngOnDestroy(): void {
    console.log('[DetalleMascotaComponent] Salida del componente.');
  }
}
