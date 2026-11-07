import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, exhaustMap, map, of, timer } from 'rxjs';

import { Solicitud } from '../../model/solicitud';
import { Mascota } from '../../model/mascota';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { SolicitudService } from '../../services/solicitud-service';

@Component({
  selector: 'app-detalle-solicitud-component',
  imports: [RouterLink, DatePipe],
  templateUrl: './detalle-solicitud-component.html',
  styleUrl: './detalle-solicitud-component.css',
})
export class DetalleSolicitudComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly solicitudes = inject(SolicitudService);
  private readonly mascotas = inject(MascotaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  solicitud: Solicitud | null = null;
  mascota: Mascota | null = null;
  nombreEntidad = 'Entidad no disponible';
  cargando = true;
  error = '';
  aviso = '';
  fotoNoDisponible = false;
  private mascotaConsultada: number | null = null;

  ngOnInit(): void {
    if (
      !this.auth.token() ||
      !this.auth.roles().includes('ROLE_CIUDADANO') ||
      !this.auth.correo()
    ) {
      void this.router.navigateByUrl('/login');
      return;
    }

    const idSolicitud = Number(this.route.snapshot.paramMap.get('idSolicitud'));
    if (!Number.isSafeInteger(idSolicitud) || idSolicitud <= 0) {
      this.mostrarError('El código de solicitud no es válido.');
      return;
    }

    this.auth
      .obtenerPerfilCiudadanoDB()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          const id = perfil?.idCiudadano;
          if (id == null || !Number.isSafeInteger(id) || id <= 0) {
            this.mostrarError('No se pudo identificar tu perfil de ciudadano.');
            return;
          }
          this.consultarProgreso(idSolicitud, id);
        },
        error: () => this.mostrarError('No se pudo cargar tu perfil. Vuelve a iniciar sesión.'),
      });
  }

  get pasoActual(): number {
    switch (this.solicitud?.estadoSolicitud) {
      case 'ENVIADA':
        return 1;
      case 'EN_REVISION':
        return 2;
      case 'APROBADA':
      case 'RECHAZADA':
        return 3;
      default:
        return 0;
    }
  }

  get etiquetaEstado(): string {
    switch (this.solicitud?.estadoSolicitud) {
      case 'ENVIADA':
        return 'Enviada';
      case 'EN_REVISION':
        return 'En revisión';
      case 'APROBADA':
        return 'Aprobada';
      case 'RECHAZADA':
        return 'Rechazada';
      default:
        return 'Estado no disponible';
    }
  }

  private consultarProgreso(idSolicitud: number, idCiudadano: number): void {
    // Carga inmediatamente y actualiza el estado cada 10 segundos mientras se vea la pantalla.
    timer(0, 10_000)
      .pipe(
        exhaustMap(() =>
          this.solicitudes.buscarPorCodigoYCiudadano(idSolicitud, idCiudadano).pipe(
            map((solicitud) => ({ solicitud, fallo: false })),
            catchError(() => of({ solicitud: null, fallo: true })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ solicitud, fallo }) => {
        this.cargando = false;
        this.error = '';
        this.aviso = '';

        if (fallo) {
          if (this.solicitud) {
            this.aviso =
              'No se pudo actualizar el estado. Se muestra la última información recibida.';
          } else {
            this.error = 'No se pudo consultar la solicitud.';
          }
        } else if (!solicitud || solicitud.ciudadanoIdCiudadano !== idCiudadano) {
          this.solicitud = null;
          this.error = 'No se encontró la solicitud en tu cuenta.';
        } else {
          this.solicitud = solicitud;
          if (this.mascotaConsultada !== solicitud.mascotaIdMascota) {
            this.cargarMascota(solicitud.mascotaIdMascota);
          }
        }

        this.cdr.markForCheck();
      });
  }

  private cargarMascota(idMascota: number): void {
    this.mascotaConsultada = idMascota;
    this.mascota = null;
    this.nombreEntidad = 'Entidad no disponible';
    this.fotoNoDisponible = false;

    this.mascotas
      .buscarPorId(idMascota)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mascota) => {
          this.mascota = mascota;
          if (mascota?.entidadIdEntidad) {
            this.mascotas
              .buscarEntidadPorId(mascota.entidadIdEntidad)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (entidad) => {
                  this.nombreEntidad = entidad?.nombreEntidad ?? 'Entidad no disponible';
                  this.cdr.markForCheck();
                },
                error: () => this.cdr.markForCheck(),
              });
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.mascotaConsultada = null;
          this.cdr.markForCheck();
        },
      });
  }

  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    this.cargando = false;
    this.cdr.markForCheck();
  }
}
