import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, DestroyRef, ViewChild, ElementRef, } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Reporte } from '../../model/reporte';
import { SolicitudService } from '../../services/solicitud-service';
import { MascotaService } from '../../services/mascota-service';
import { Solicitud } from '../../model/solicitud';
import { Mascota } from '../../model/mascota';
import { map, switchMap, catchError, forkJoin, of, Observable, Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-home-entidad-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-entidad-component.html',
  styleUrl: './home-entidad-component.css',
})
export class HomeEntidadComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reporteService = inject(ReporteService);
  private readonly solicitudService = inject(SolicitudService);
  private readonly mascotaService = inject(MascotaService);
  private consultaSolicitudes: Subscription | null = null;
  private consultaReportes: Subscription | null = null;

  @ViewChild('chartEntidadReportesCanvas')
  chartEntidadReportesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEntidadSolicitudesCanvas')
  chartEntidadSolicitudesCanvas!: ElementRef<HTMLCanvasElement>;

  private chartReportes: Chart | null = null;
  private chartSolicitudes: Chart | null = null;

  menuMobileAbierto: boolean = false;

  nombreEntidad = '';
  idEntidad: number | null = null;
  cargando = true;
  error = '';
  cargandoReportes = false;
  errorReportes = '';
  reportesRecientes: Reporte[] = [];
  resumen: { recibidos: number; urgentes: number; enRevision: number; atendidos: number } | null =
    null;
  cargandoSolicitudes = false;
  errorSolicitudes = '';
  solicitudesPendientes: number | null = null;
  solicitudesRecientes: { solicitud: Solicitud; mascota: Mascota | null }[] = [];

  tieneReportesEntidad: boolean = false;
  tieneSolicitudesEntidad: boolean = false;

  ngOnInit(): void {
    // No reutilizar la identidad de una entidad de una sesión anterior.
    this.auth.limpiarDatosEntidad();
    const roles = this.auth.roles();
    if (!this.auth.token() || !Array.isArray(roles) || !roles.includes('ROLE_ENTIDAD')) {
      this.cargando = false;
      void this.router.navigateByUrl('/login');
      return;
    }

    if (!this.auth.correoEntidad()) {
      this.cargando = false;
      this.auth.cerrarSesion();
      void this.router.navigateByUrl('/login');
      return;
    }

    const tokenSesion = this.auth.token();
    this.auth
      .obtenerPerfilEntidadDB()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entidad) => {
          this.cargando = false;
          if (!this.sesionVigente(tokenSesion)) {
            this.error = 'La sesión cambió. Recarga la página para consultar tu entidad.';
            this.cdr.markForCheck();
            return;
          }
          if (!entidad) {
            this.error = 'No se encontró un perfil de entidad asociado a tu cuenta.';
          } else {
            this.idEntidad = entidad.idEntidad!;
            this.nombreEntidad = entidad.nombreEntidad.trim();
            this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
            this.cargarReportes();
            this.cargarSolicitudes();
          }
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | Error) => {
          this.cargando = false;
          if (!this.sesionVigente(tokenSesion)) {
            this.error = 'La sesión cambió. Recarga la página para consultar tu entidad.';
            this.cdr.markForCheck();
            return;
          }
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            this.auth.cerrarSesion();
            void this.router.navigateByUrl('/login');
          } else {
            this.error =
              error instanceof HttpErrorResponse && error.status === 404
                ? 'No se encontró un perfil de entidad asociado a tu cuenta.'
                : 'No se pudo cargar el perfil de la entidad. Intenta recargar la página.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  cargarSolicitudes(): void {
    this.consultaSolicitudes?.unsubscribe();
    this.solicitudesPendientes = null;
    this.solicitudesRecientes = [];
    this.errorSolicitudes = '';
    this.cargandoSolicitudes = false;
    this.tieneSolicitudesEntidad = false;
    const idEntidad = this.idEntidad;
    const tokenSesion = this.auth.token();
    if (
      idEntidad === null ||
      !Number.isSafeInteger(idEntidad) ||
      idEntidad <= 0 ||
      !this.sesionVigente(tokenSesion, idEntidad)
    ) {
      this.errorSolicitudes = 'No se pudo identificar una sesión de entidad válida.';
      return;
    }

    this.cargandoSolicitudes = true;
    this.consultaSolicitudes = this.solicitudService
      .listarPorEntidad(idEntidad)
      .pipe(
        map((solicitudes) => {
          if (
            !Array.isArray(solicitudes) ||
            solicitudes.some(
              (solicitud) =>
                !solicitud ||
                !Number.isSafeInteger(solicitud.idSolicitud) ||
                solicitud.idSolicitud! <= 0 ||
                !Number.isSafeInteger(solicitud.mascotaIdMascota) ||
                solicitud.mascotaIdMascota <= 0 ||
                !['EN_REVISION', 'APROBADA', 'RECHAZADA'].includes(solicitud.estadoSolicitud || ''),
            )
          ) {
            throw new Error('La API no devolvió un listado válido de solicitudes.');
          }

          const resumenSolicitudes = {
            enRevision: solicitudes.filter((s) => s.estadoSolicitud === 'EN_REVISION').length,
            aprobadas: solicitudes.filter((s) => s.estadoSolicitud === 'APROBADA').length,
            rechazadas: solicitudes.filter((s) => s.estadoSolicitud === 'RECHAZADA').length,
            total: solicitudes.length,
          };

          const pendientes = solicitudes
            .filter((solicitud) => solicitud.estadoSolicitud === 'EN_REVISION')
            .sort((a, b) => {
              const fechaA = Date.parse(a.fechaSolicitud || '');
              const fechaB = Date.parse(b.fechaSolicitud || '');
              return (
                (Number.isNaN(fechaB) ? -Infinity : fechaB) -
                  (Number.isNaN(fechaA) ? -Infinity : fechaA) || b.idSolicitud! - a.idSolicitud!
              );
            });

          return { pendientes, resumenSolicitudes };
        }),
        switchMap(({ pendientes, resumenSolicitudes }) => {
          if (!this.sesionVigente(tokenSesion, idEntidad)) {
            throw new Error('La sesión cambió durante la consulta.');
          }
          return this.consultarMascotasPendientes(pendientes, idEntidad).pipe(
            map((datos) => ({ ...datos, resumenSolicitudes })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (datos) => {
          this.cargandoSolicitudes = false;
          if (!this.sesionVigente(tokenSesion, idEntidad)) {
            this.errorSolicitudes =
              'La sesión cambió. Recarga la página para consultar tus solicitudes.';
          } else {
            this.solicitudesPendientes = datos.cantidad;
            this.solicitudesRecientes = datos.recientes;
            this.tieneSolicitudesEntidad = datos.resumenSolicitudes.total > 0;
            this.renderizarGraficoSolicitudes(
              datos.resumenSolicitudes.enRevision,
              datos.resumenSolicitudes.aprobadas,
              datos.resumenSolicitudes.rechazadas,
            );
          }
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | Error) => {
          this.cargandoSolicitudes = false;
          this.errorSolicitudes =
            'No se pudieron cargar las solicitudes. Intenta recargar la página.';
          if (
            this.sesionVigente(tokenSesion, idEntidad) &&
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            this.auth.cerrarSesion();
            void this.router.navigateByUrl('/login');
          }
          this.cdr.markForCheck();
        },
      });
  }

  private consultarMascotasPendientes(
    pendientes: Solicitud[],
    idEntidad: number,
  ): Observable<{
    cantidad: number;
    recientes: { solicitud: Solicitud; mascota: Mascota | null }[];
  }> {
    if (!pendientes.length) return of({ cantidad: 0, recientes: [] });
    const recientes = pendientes.slice(0, 2);
    const ids = recientes.map((solicitud) => solicitud.mascotaIdMascota);
    const idsDistintos = ids.filter((id, indice) => ids.indexOf(id) === indice);

    return forkJoin(idsDistintos.map((id) => this.consultarMascota(id, idEntidad))).pipe(
      map((mascotas) => ({
        cantidad: pendientes.length,
        recientes: recientes.map((solicitud) => ({
          solicitud,
          mascota:
            mascotas.find((mascota) => mascota?.idMascota === solicitud.mascotaIdMascota) || null,
        })),
      })),
    );
  }

  private consultarMascota(idMascota: number, idEntidad: number): Observable<Mascota | null> {
    return this.mascotaService.buscarPorId(idMascota).pipe(
      map((mascota) => {
        if (!mascota || mascota.idMascota !== idMascota || mascota.entidadIdEntidad !== idEntidad) {
          throw new Error('No se pudo verificar la mascota de la solicitud.');
        }
        return mascota;
      }),
      catchError((error: HttpErrorResponse | Error) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          throw error;
        }
        return of(null);
      }),
    );
  }

  private sesionVigente(tokenSesion: string | null, idEntidad?: number): boolean {
    const roles = this.auth.roles();
    return (
      !!tokenSesion &&
      this.auth.token() === tokenSesion &&
      !!this.auth.correoEntidad() &&
      Array.isArray(roles) &&
      roles.includes('ROLE_ENTIDAD') &&
      (idEntidad === undefined ||
        (this.idEntidad === idEntidad && this.auth.idEntidad() === idEntidad))
    );
  }

  cargarReportes(): void {
    this.consultaReportes?.unsubscribe();
    this.resumen = null;
    this.reportesRecientes = [];
    this.errorReportes = '';
    this.tieneReportesEntidad = false;
    const idEntidad = this.idEntidad;
    const tokenSesion = this.auth.token();
    if (
      idEntidad === null ||
      !Number.isSafeInteger(idEntidad) ||
      idEntidad <= 0 ||
      !this.sesionVigente(tokenSesion, idEntidad)
    ) {
      this.cargandoReportes = false;
      this.errorReportes = 'No se pudo identificar una entidad válida para consultar sus reportes.';
      return;
    }

    this.cargandoReportes = true;
    this.consultaReportes = this.reporteService
      .listarPorEntidad(idEntidad)
      .pipe(
        map((reportes) => {
          if (
            !Array.isArray(reportes) ||
            reportes.some(
              (reporte) =>
                !reporte ||
                !Number.isSafeInteger(reporte.idReporte) ||
                reporte.idReporte! <= 0 ||
                reporte.entidad?.idEntidad !== idEntidad,
            )
          ) {
            throw new Error('La API no devolvió los reportes de la entidad autenticada.');
          }
          return [...reportes].sort((a, b) => {
            const fechaA = Date.parse(a.fechaReporte || '');
            const fechaB = Date.parse(b.fechaReporte || '');
            return (
              (Number.isNaN(fechaB) ? -Infinity : fechaB) -
                (Number.isNaN(fechaA) ? -Infinity : fechaA) || b.idReporte! - a.idReporte!
            );
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (reportes) => {
          this.cargandoReportes = false;
          if (!this.sesionVigente(tokenSesion, idEntidad)) {
            this.errorReportes = 'La sesión cambió. Recarga la página para consultar tus reportes.';
            this.cdr.markForCheck();
            return;
          }
          this.resumen = {
            recibidos: reportes.filter((reporte) => reporte.estado === 'R').length,
            urgentes: reportes.filter((reporte) => reporte.nivelUrgencia === 'AL').length,
            enRevision: reportes.filter((reporte) => reporte.estado === 'ER').length,
            atendidos: reportes.filter((reporte) => reporte.estado === 'AT').length,
          };
          this.reportesRecientes = reportes.slice(0, 3);
          this.tieneReportesEntidad = reportes.length > 0;
          this.renderizarGraficoReportes(
            this.resumen.recibidos,
            this.resumen.enRevision,
            this.resumen.atendidos,
          );
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | Error) => {
          this.cargandoReportes = false;
          this.errorReportes = 'No se pudieron cargar los reportes. Intenta recargar la página.';
          if (
            this.sesionVigente(tokenSesion, idEntidad) &&
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            this.idEntidad = null;
            this.nombreEntidad = '';
            this.auth.cerrarSesion();
            void this.router.navigateByUrl('/login');
          }
          this.cdr.markForCheck();
        },
      });
  }

  private renderizarGraficoReportes(
    recibidos: number,
    enRevision: number,
    atendidos: number,
  ): void {
    console.log('Datos gráfico reportes (Entidad):', { recibidos, enRevision, atendidos });
    setTimeout(() => {
      if (!this.chartEntidadReportesCanvas?.nativeElement) return;
      this.chartReportes?.destroy();

      this.chartReportes = new Chart(this.chartEntidadReportesCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Recibidos', 'En revisión', 'Atendidos'],
          datasets: [
            {
              data: [recibidos, enRevision, atendidos],
              backgroundColor: ['#007476', '#005aa0', '#7da766'],
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
          },
        },
      });
    }, 0);
  }

  private renderizarGraficoSolicitudes(
    enRevision: number,
    aprobadas: number,
    rechazadas: number,
  ): void {
    console.log('Datos gráfico solicitudes (Entidad):', { enRevision, aprobadas, rechazadas });
    setTimeout(() => {
      if (!this.chartEntidadSolicitudesCanvas?.nativeElement) return;
      this.chartSolicitudes?.destroy();

      this.chartSolicitudes = new Chart(this.chartEntidadSolicitudesCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['En revisión', 'Aprobadas', 'Rechazadas'],
          datasets: [
            {
              label: 'Solicitudes',
              data: [enRevision, aprobadas, rechazadas],
              backgroundColor: ['#005aa0', '#2d8a65', '#e23737'],
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
            },
          },
        },
      });
    }, 0);
  }

  abrirMenu(): void {
    this.menuMobileAbierto = true;
  }

  cerrarMenu(): void {
    this.menuMobileAbierto = false;
  }

  ngOnDestroy(): void {
    this.chartReportes?.destroy();
    this.chartSolicitudes?.destroy();
  }
}
