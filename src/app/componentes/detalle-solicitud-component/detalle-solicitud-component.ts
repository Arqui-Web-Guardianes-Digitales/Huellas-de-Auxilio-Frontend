import { ChangeDetectorRef, Component, OnDestroy, DestroyRef, OnInit, inject } from '@angular/core';
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
export class DetalleSolicitudComponent implements OnInit, OnDestroy {
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
    console.log('[DetalleSolicitudComponent] Entrada al componente.');
    if (
      !this.auth.token() ||
      !this.auth.roles().includes('ROLE_CIUDADANO') ||
      !this.auth.correo()
    ) {
      console.warn(
        '[DetalleSolicitudComponent] Acceso no autorizado; se solicita volver al login.',
      );
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
          console.log('[DetalleSolicitudComponent] Perfil confirmado; se consultará el progreso.', {
            idSolicitud,
          });
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
    console.log('[DetalleSolicitudComponent] Seguimiento automático iniciado.', {
      idSolicitud,
      intervaloSegundos: 10,
    });
    // Carga inmediatamente y actualiza el estado cada 10 segundos mientras se vea la pantalla.
    timer(0, 10_000)
      .pipe(
        exhaustMap(() =>
          this.solicitudes.buscarPorCodigoYCiudadano(idSolicitud, idCiudadano).pipe(
            map((solicitud) => ({ solicitud, fallo: false })),
            catchError(() => {
              console.error('[DetalleSolicitudComponent] Error al consultar el estado en la API.', {
                idSolicitud,
              });
              return of({ solicitud: null, fallo: true });
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ solicitud, fallo }) => {
        this.cargando = false;
        this.error = '';
        this.aviso = '';

        if (fallo) {
          console.warn('[DetalleSolicitudComponent] Consulta de progreso fallida.', {
            conservaUltimaRespuesta: Boolean(this.solicitud),
          });
          if (this.solicitud) {
            this.aviso =
              'No se pudo actualizar el estado. Se muestra la última información recibida.';
          } else {
            this.error = 'No se pudo consultar la solicitud.';
          }
        } else if (!solicitud || solicitud.ciudadanoIdCiudadano !== idCiudadano) {
          console.warn(
            '[DetalleSolicitudComponent] No se encontró la solicitud en la cuenta actual.',
            { idSolicitud },
          );
          this.solicitud = null;
          this.error = 'No se encontró la solicitud en tu cuenta.';
        } else {
          const estadoAnterior = this.solicitud?.estadoSolicitud;
          this.solicitud = solicitud;
          console.log('[DetalleSolicitudComponent] Progreso recibido.', {
            idSolicitud,
            estado: solicitud.estadoSolicitud,
          });
          if (estadoAnterior && estadoAnterior !== solicitud.estadoSolicitud) {
            console.log('[DetalleSolicitudComponent] Cambio de estado detectado.', {
              estadoAnterior,
              estadoActual: solicitud.estadoSolicitud,
            });
          }
          if (this.mascotaConsultada !== solicitud.mascotaIdMascota) {
            this.cargarMascota(solicitud.mascotaIdMascota);
          }
        }

        this.cdr.markForCheck();
      });
  }

  private cargarMascota(idMascota: number): void {
    console.log('[DetalleSolicitudComponent] Consulta de mascota iniciada.', { idMascota });
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
          if (mascota) {
            console.log('[DetalleSolicitudComponent] Mascota recibida.', { idMascota });
          } else {
            console.warn('[DetalleSolicitudComponent] La API no devolvió la mascota.', {
              idMascota,
            });
          }
          if (mascota?.entidadIdEntidad) {
            console.log('[DetalleSolicitudComponent] Consulta de entidad iniciada.', {
              idEntidad: mascota.entidadIdEntidad,
            });
            this.mascotas
              .buscarEntidadPorId(mascota.entidadIdEntidad)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (entidad) => {
                  if (entidad) {
                    console.log('[DetalleSolicitudComponent] Entidad recibida.', {
                      idEntidad: entidad.idEntidad,
                    });
                  } else {
                    console.warn('[DetalleSolicitudComponent] La API no devolvió la entidad.');
                  }
                  this.nombreEntidad = entidad?.nombreEntidad ?? 'Entidad no disponible';
                  this.cdr.markForCheck();
                },
                error: () => {
                  console.warn('[DetalleSolicitudComponent] No se pudo cargar la entidad.');
                  this.cdr.markForCheck();
                },
              });
          }
          this.cdr.markForCheck();
        },
        error: () => {
          console.error('[DetalleSolicitudComponent] No se pudo cargar la mascota.', { idMascota });
          this.mascotaConsultada = null;
          this.cdr.markForCheck();
        },
      });
  }

  private mostrarError(mensaje: string): void {
    console.error('[DetalleSolicitudComponent]', mensaje);
    this.error = mensaje;
    this.cargando = false;
    this.cdr.markForCheck();
  }

  ocultarFoto(): void {
    console.warn('[DetalleSolicitudComponent] Foto de mascota no disponible.');
    this.fotoNoDisponible = true;
  }

  registrarNavegacion(destino: string | (string | number)[]): void {
    console.log('[DetalleSolicitudComponent] Navegación solicitada.', { destino });
  }

  ngOnDestroy(): void {
    console.log('[DetalleSolicitudComponent] Salida del componente.');
  }
}
