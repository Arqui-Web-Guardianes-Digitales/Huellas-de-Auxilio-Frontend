import { ChangeDetectorRef, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { SolicitudService } from '../../services/solicitud-service';
import { Mascota } from '../../model/mascota';
import { Solicitud } from '../../model/solicitud';

@Component({
  selector: 'app-detalle-solicitud-entidad-component',
  imports: [RouterLink, DatePipe],
  templateUrl: './detalle-solicitud-entidad-component.html',
  styleUrl: './detalle-solicitud-entidad-component.css',
})
export class DetalleSolicitudEntidadComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly mascotaService = inject(MascotaService);
  private readonly solicitudService = inject(SolicitudService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('confirmacion') private confirmacion?: ElementRef<HTMLDialogElement>;
  private tokenSesion: string | null = null;
  private idEntidad: number | null = null;
  readonly idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));
  readonly idSolicitud = Number(this.route.snapshot.paramMap.get('idSolicitud'));
  readonly volver = this.route.snapshot.queryParamMap.get('origen') === 'mascota'
    ? ['/solicitudes-mascota', this.idMascota] : ['/solicitudes-entidad'];
  nombreEntidad = '';
  menuMobileAbierto = false;
  cargando = true;
  guardando = false;
  gestionada = false;
  error = '';
  errorGestion = '';
  accion: 'aprobar' | 'rechazar' | null = null;
  mascota: Mascota | null = null;
  solicitud: Solicitud | null = null;

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    if (!this.tokenSesion || !this.auth.correoEntidad() || !this.auth.roles().includes('ROLE_ENTIDAD')) {
      this.cargando = false; void this.router.navigateByUrl('/login'); return;
    }
    if (![this.idMascota, this.idSolicitud].every(id => Number.isSafeInteger(id) && id > 0)) {
      this.mostrarError('El identificador de mascota o solicitud no es válido.'); return;
    }
    this.auth.limpiarDatosEntidad();
    this.auth.obtenerPerfilEntidadDB().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entidad) => {
        if (!this.comprobarSesion()) return;
        if (!entidad) { this.mostrarError('No se encontró tu perfil de entidad.'); return; }
        this.idEntidad = entidad.idEntidad!; this.nombreEntidad = entidad.nombreEntidad;
        this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
        this.cargarMascota();
      },
      error: (error: HttpErrorResponse) => this.errorPeticion(error),
    });
  }

  private cargarMascota(): void {
    this.mascotaService.buscarPorId(this.idMascota).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (mascota) => {
        if (!this.comprobarSesion()) return;
        if (!mascota || mascota.entidadIdEntidad !== this.idEntidad) {
          this.mostrarError('No se encontró una mascota de tu entidad con ese identificador.'); return;
        }
        this.mascota = mascota; this.cargarSolicitud();
      },
      error: (error: HttpErrorResponse) => this.errorPeticion(error),
    });
  }

  cargarSolicitud(): void {
    if (!this.comprobarSesion() || !this.mascota || this.guardando) return;
    this.cargando = true; this.errorGestion = ''; this.accion = null;
    this.solicitudService.buscarPorSolicitudYMascota(this.idMascota, this.idSolicitud)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (solicitud) => {
          if (!this.comprobarSesion()) return;
          this.cargando = false;
          if (!solicitud || solicitud.idSolicitud !== this.idSolicitud || solicitud.mascotaIdMascota !== this.idMascota) {
            this.mostrarError('No se encontró la solicitud para esta mascota.'); return;
          }
          this.solicitud = solicitud; this.error = '';
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => this.errorPeticion(error),
      });
  }

  abrirConfirmacion(accion: 'aprobar' | 'rechazar'): void {
    if (!this.comprobarSesion() || this.guardando || this.cargando || this.error || this.errorGestion || this.gestionada
      || this.solicitud?.estadoSolicitud !== 'EN_REVISION') return;
    this.accion = accion; this.errorGestion = '';
    this.confirmacion?.nativeElement.showModal();
  }
  cerrarConfirmacion(): void {
    if (this.guardando) return;
    this.confirmacion?.nativeElement.close(); this.accion = null;
  }

  confirmarGestion(): void {
    if (!this.comprobarSesion() || this.guardando || this.cargando || this.error || this.errorGestion || this.gestionada
      || !this.accion || this.solicitud?.estadoSolicitud !== 'EN_REVISION') return;
    const estado = this.accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA';
    const peticion = this.accion === 'aprobar' ? this.solicitudService.aprobarSolicitud(this.idSolicitud)
      : this.solicitudService.rechazarSolicitud(this.idSolicitud);
    this.guardando = true; this.errorGestion = '';
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false; this.cerrarConfirmacion();
        if (!respuesta || respuesta.idSolicitud !== this.idSolicitud || respuesta.mascotaIdMascota !== this.idMascota
          || respuesta.estadoSolicitud !== estado) {
          this.errorGestion = 'No se pudo confirmar el cambio. Recarga la solicitud antes de reintentar.';
        } else {
          this.solicitud = { ...this.solicitud!, estadoSolicitud: respuesta.estadoSolicitud };
          this.gestionada = true;
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false; this.cerrarConfirmacion();
        this.errorGestion = error.status === 409 ? 'La solicitud ya fue gestionada o la mascota ya no está disponible. Recarga para consultar el estado actual.'
          : error.status === 403 ? 'Solo puedes gestionar solicitudes de tu entidad.'
          : 'No se pudo confirmar el cambio. Recarga la solicitud antes de reintentar.';
        if (error.status === 401) { this.auth.cerrarSesion(); void this.router.navigateByUrl('/login'); }
        this.cdr.markForCheck();
      },
    });
  }

  etiquetaEstado(estado?: string): string {
    switch (estado) {
      case 'EN_REVISION': return 'En revisión';
      case 'APROBADA': return 'Aprobado';
      case 'RECHAZADA': return 'Rechazado';
      default: return 'Estado no disponible';
    }
  }
  private comprobarSesion(): boolean {
    if (this.tokenSesion && this.auth.token() === this.tokenSesion && this.auth.correoEntidad()
      && this.auth.roles().includes('ROLE_ENTIDAD')
      && (this.idEntidad === null || this.auth.idEntidad() === this.idEntidad)) return true;
    this.guardando = false; this.cerrarConfirmacion();
    this.solicitud = null; this.mascota = null; this.nombreEntidad = ''; this.gestionada = false;
    this.mostrarError('La sesión cambió o caducó. Vuelve a iniciar sesión.');
    return false;
  }
  private errorPeticion(error: HttpErrorResponse): void {
    if (!this.comprobarSesion()) return;
    this.mostrarError(error.status === 403 ? 'Solo puedes consultar solicitudes de tu entidad.'
      : 'No se pudo cargar el detalle de la solicitud. Regresa al listado e intenta nuevamente.');
    if (error.status === 401) { this.auth.cerrarSesion(); void this.router.navigateByUrl('/login'); }
  }
  private mostrarError(mensaje: string): void {
    this.error = mensaje; this.cargando = false; this.cdr.markForCheck();
  }
  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }
}
