import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Observable, catchError, finalize, forkJoin, from, map, of, switchMap, tap, timeout } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { NotificacionService } from '../../services/notificacion-service';
import { SolicitudService } from '../../services/solicitud-service';
import { Notificacion, SesionNotificaciones } from '../../model/notificacion';

@Component({
  selector: 'app-notificaciones-component',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatCardModule],
  templateUrl: './notificaciones-component.html',
  styleUrl: './notificaciones-component.css',
})
export class NotificacionesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly servicio = inject(NotificacionService);
  private readonly solicitudes = inject(SolicitudService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private tokenSesion: string | null = null;

  sesion: SesionNotificaciones | null = null;
  notificaciones: Notificacion[] = [];
  menuAbierto = false;
  cargando = false;
  marcandoTodas = false;
  marcando = new Set<number>();
  abriendoId: number | null = null;
  error = '';
  errorOperacion = '';
  mensaje = '';

  get esEntidad(): boolean {
    return this.sesion?.rol === 'ENTIDAD' || (!this.sesion && this.auth.roles().includes('ROLE_ENTIDAD'));
  }

  get rutaInicio(): string { return this.esEntidad ? '/home-entidad' : '/home-ciudadano'; }
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }
  get hayNoLeidas(): boolean { return this.notificaciones.some(n => !n.estadoNotificacion); }
  get ocupado(): boolean { return this.cargando || this.marcandoTodas || this.marcando.size > 0 || this.abriendoId !== null; }

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !roles.some(rol => rol === 'ROLE_CIUDADANO' || rol === 'ROLE_ENTIDAD')) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.actualizar();
  }

  actualizar(): void {
    if (this.ocupado || !this.comprobarSesion()) return;
    this.cargando = true;
    this.error = '';
    this.errorOperacion = '';
    this.mensaje = '';
    const sesion = this.sesion ? of(this.sesion) : this.servicio.obtenerSesion();
    sesion.pipe(
      timeout(20000),
      switchMap(cuenta => {
        this.sesion = cuenta;
        this.registrar('Usuario identificado', { idUsuario: cuenta.idUsuario, rol: cuenta.rol });
        return this.servicio.listarPorUsuario(cuenta.idUsuario).pipe(timeout(20000));
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: notificaciones => {
        if (!this.comprobarSesion()) return;
        this.notificaciones = notificaciones;
        this.registrar('Lista recibida', { total: notificaciones.length, noLeidas: notificaciones.filter(n => !n.estadoNotificacion).length });
        this.cdr.markForCheck();
      },
      error: error => { this.error = this.mensajeError(error, 'cargar'); this.cdr.markForCheck(); },
    });
  }

  seleccionarNotificacion(notificacion: Notificacion): void {
    if (this.ocupado || notificacion.estadoNotificacion || !this.comprobarSesion()) return;
    this.marcando.add(notificacion.idNotificacion);
    this.errorOperacion = '';
    this.confirmarLectura(notificacion).pipe(
      timeout(20000), takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.marcando.delete(notificacion.idNotificacion); this.cdr.markForCheck(); }),
    ).subscribe({
      error: error => { this.errorOperacion = this.mensajeError(error, 'marcar como leída'); this.cdr.markForCheck(); },
    });
  }

  teclaNotificacion(evento: KeyboardEvent, notificacion: Notificacion): void {
    if (evento.target !== evento.currentTarget || (evento.key !== 'Enter' && evento.key !== ' ')) return;
    evento.preventDefault();
    this.seleccionarNotificacion(notificacion);
  }

  marcarTodasLeidas(): void {
    if (this.ocupado || !this.hayNoLeidas || !this.comprobarSesion()) return;
    const pendientes = this.notificaciones.filter(n => !n.estadoNotificacion);
    this.marcandoTodas = true;
    this.errorOperacion = '';
    this.mensaje = '';
    forkJoin(pendientes.map(notificacion => this.confirmarLectura(notificacion).pipe(
      timeout(20000),
      catchError(error => {
        this.registrar('No se confirmó la lectura', { idNotificacion: notificacion.idNotificacion, estadoHTTP: error instanceof HttpErrorResponse ? error.status : null });
        if (error instanceof HttpErrorResponse && error.status === 401) this.mensajeError(error, 'marcar como leída');
        return of(null);
      }),
    ))).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.marcandoTodas = false; this.cdr.markForCheck(); }),
    ).subscribe(resultados => {
      if (!this.comprobarSesion()) return;
      const confirmadas = resultados.filter(n => n !== null).length;
      this.mensaje = 'Se marcaron ' + confirmadas + ' de ' + pendientes.length + ' notificaciones como leídas.';
      if (confirmadas !== pendientes.length) this.errorOperacion = 'Algunas notificaciones no pudieron marcarse. Puedes intentarlo nuevamente.';
      this.registrar('Marcado de todas finalizado', { confirmadas, pendientes: pendientes.length - confirmadas });
      this.cdr.markForCheck();
    });
  }

  tieneDetalle(notificacion: Notificacion): boolean {
    return this.idValido(notificacion.reporteIdReporte) || this.idValido(notificacion.solicitudIdSolicitud);
  }

  abrirDetalle(notificacion: Notificacion): void {
    if (this.ocupado || !this.tieneDetalle(notificacion) || !this.comprobarSesion()) return;
    this.abriendoId = notificacion.idNotificacion;
    this.errorOperacion = '';
    const lectura = notificacion.estadoNotificacion ? of(notificacion) : this.confirmarLectura(notificacion);
    lectura.pipe(
      timeout(20000),
      switchMap(() => this.resolverRuta(notificacion).pipe(timeout(20000))),
      switchMap(ruta => {
        if (!this.comprobarSesion()) return of(false);
        this.registrar('Abriendo detalle', { idNotificacion: notificacion.idNotificacion, ruta });
        return from(this.router.navigate(ruta));
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.abriendoId = null; this.cdr.markForCheck(); }),
    ).subscribe({
      next: navegada => { if (!navegada && this.comprobarSesion()) this.errorOperacion = 'No se pudo abrir el detalle.'; },
      error: error => { this.errorOperacion = this.mensajeError(error, 'abrir el detalle'); this.cdr.markForCheck(); },
    });
  }

  private confirmarLectura(notificacion: Notificacion): Observable<Notificacion> {
    return this.servicio.marcarComoLeida(notificacion.idNotificacion).pipe(tap(respuesta => {
      if (!this.comprobarSesion()) return;
      this.notificaciones = this.notificaciones.map(n => n.idNotificacion === respuesta.idNotificacion ? { ...n, estadoNotificacion: true } : n);
      this.registrar('Lectura confirmada', { idNotificacion: respuesta.idNotificacion, leida: respuesta.estadoNotificacion });
      this.cdr.markForCheck();
    }));
  }

  private resolverRuta(notificacion: Notificacion): Observable<(string | number)[]> {
    if (this.idValido(notificacion.reporteIdReporte)) {
      return of([this.esEntidad ? '/detalle-reporte-entidad' : '/seguimiento-reporte', notificacion.reporteIdReporte!]);
    }
    if (!this.esEntidad) return of(['/detalle-solicitud', notificacion.solicitudIdSolicitud!]);
    if (!this.sesion) throw new Error('No se identificó la entidad.');
    return this.solicitudes.listarPorEntidad(this.sesion.idPerfil).pipe(map(solicitudes => {
      const solicitud = solicitudes?.find(s => s.idSolicitud === notificacion.solicitudIdSolicitud);
      if (!solicitud || !this.idValido(solicitud.mascotaIdMascota)) throw new Error('No se encontró la solicitud de tu entidad.');
      return ['/detalle-solicitud-entidad', solicitud.mascotaIdMascota, solicitud.idSolicitud!];
    }));
  }

  private idValido(id: number | null | undefined): boolean { return Number.isSafeInteger(id) && id! > 0; }

  private comprobarSesion(): boolean {
    if (this.tokenSesion && this.auth.token() === this.tokenSesion) return true;
    this.notificaciones = [];
    void this.router.navigateByUrl('/login');
    return false;
  }

  private mensajeError(error: unknown, operacion: string): string {
    this.registrar('Error de operación', { operacion, estadoHTTP: error instanceof HttpErrorResponse ? error.status : null });
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        this.auth.cerrarSesion();
        void this.router.navigateByUrl('/login');
        return 'Tu sesión ha vencido. Inicia sesión nuevamente.';
      }
      if (error.status === 403) return 'No tienes permiso para acceder a estas notificaciones.';
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
    }
    return 'No se pudo ' + operacion + '. Inténtalo nuevamente.';
  }

  private registrar(evento: string, datos: Record<string, unknown>): void {
    console.log(evento, datos);
  }

  abrirMenu(): void { this.menuAbierto = true; }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void { this.menuAbierto = false; }
}
