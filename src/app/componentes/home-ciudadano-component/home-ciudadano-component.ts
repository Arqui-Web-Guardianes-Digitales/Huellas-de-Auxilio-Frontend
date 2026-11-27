import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef, } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { SolicitudService } from '../../services/solicitud-service';
import { ResumenReportes, Reporte } from '../../model/reporte';
import { Solicitud } from '../../model/solicitud';

Chart.register(...registerables);

@Component({
  selector: 'app-home-ciudadano-component',
  standalone: true,
  imports: [RouterLink, PercentPipe],
  templateUrl: './home-ciudadano-component.html',
  styleUrl: './home-ciudadano-component.css',
})
export class HomeCiudadanoComponent implements OnInit {
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly reporteService = inject(ReporteService);
  private readonly solicitudService = inject(SolicitudService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('chartReportesCanvas') chartReportesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSolicitudesCanvas') chartSolicitudesCanvas!: ElementRef<HTMLCanvasElement>;

  private chartReportes: Chart | null = null;
  private chartSolicitudes: Chart | null = null;

  menuMobileAbierto: boolean = false;
  resumen: ResumenReportes = { total: 0, enRevision: 0, atendidos: 0 };
  ultimoReporte: Reporte | null = null;
  fotoReciente: string = '/img/evidencia-foto-3.png';
  nombreUsuario: string = 'Ciudadano';

  resumenGraficoReportes: { recibidos: number; enRevision: number; atendidos: number } | null =
    null;
  resumenGraficoSolicitudes: { enRevision: number; aprobadas: number; rechazadas: number } | null =
    null;

  tieneReportes: boolean = false;
  tieneSolicitudes: boolean = false;

  ngOnInit(): void {
    console.log('ngOnInit de HomeCiudadanoComponent');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.log('Sesión no válida o rol incorrecto, redirigiendo a /login');
      this.router.navigateByUrl('/login');
      return;
    }

    this.auth.obtenerPerfilCiudadanoDB().subscribe({
      next: (ciudadano) => {
        console.log('Perfil de ciudadano recibido:', ciudadano);
        if (ciudadano && ciudadano.idCiudadano) {
          this.auth.guardarDatosCiudadano(
            ciudadano.idCiudadano,
            ciudadano.nombreCompleto || 'Ciudadano',
          );
          this.nombreUsuario = this.auth.nombreCiudadano();
          this.cargarEstadisticas();
        }
      },
      error: (err) => {
        console.log('Error al obtener perfil del ciudadano, usando fallback:', err);
        this.cargarEstadisticas();
      },
    });
  }

  cargarEstadisticas(): void {
    const idCiudadano = this.auth.idCiudadano();
    console.log('Cargando estadísticas y gráficos para idCiudadano:', idCiudadano);

    this.reporteService.obtenerResumenCiudadano(idCiudadano).subscribe({
      next: (datos) => {
        console.log('Resumen de reportes recibido:', datos);
        if (datos) {
          this.resumen = datos;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.log('Error al cargar resumen:', err),
    });

    this.reporteService.listarPorCiudadano(idCiudadano).subscribe({
      next: (reportes) => {
        console.log('Listado de reportes recibido en Home:', reportes);
        if (reportes && reportes.length > 0) {
          this.tieneReportes = true;
          const listaOrdenada = [...reportes].sort(
            (a, b) => (b.idReporte || 0) - (a.idReporte || 0),
          );
          this.ultimoReporte = listaOrdenada[0];

          this.reporteService.obtenerEvidencias(this.ultimoReporte.idReporte!).subscribe({
            next: (evs) => {
              console.log('Evidencias del último reporte:', evs);
              if (evs && evs.length > 0) {
                this.fotoReciente = evs[0].urlEvidencia;
              }
              this.cdr.detectChanges();
            },
            error: (err) => console.log('Error al obtener evidencias:', err),
          });

          this.renderizarGraficoReportes(reportes);
        } else {
          this.tieneReportes = false;
          this.resumenGraficoReportes = null;
          this.chartReportes?.destroy();
          this.chartReportes = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.log('Error al listar reportes en Home:', err),
    });

    this.solicitudService.listarPorCiudadano(idCiudadano).subscribe({
      next: (solicitudes) => {
        console.log('Solicitudes de adopción recibidas en Home:', solicitudes);
        const lista = solicitudes || [];
        this.tieneSolicitudes = lista.length > 0;
        if (this.tieneSolicitudes) {
          this.renderizarGraficoSolicitudes(lista);
        } else {
          this.resumenGraficoSolicitudes = null;
          this.chartSolicitudes?.destroy();
          this.chartSolicitudes = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.log('Error al listar solicitudes en Home:', err),
    });
  }

  private renderizarGraficoReportes(reportes: Reporte[]): void {
    const recibidos = reportes.filter((r) => r.estado === 'R').length;
    const enRevision = reportes.filter((r) => r.estado === 'ER').length;
    const atendidos = reportes.filter((r) => r.estado === 'AT').length;
    this.resumenGraficoReportes = { recibidos, enRevision, atendidos };
    console.log('Datos gráfico reportes (Ciudadano):', this.resumenGraficoReportes);

    this.cdr.detectChanges();
    if (!this.chartReportesCanvas?.nativeElement) return;
    this.chartReportes?.destroy();

    this.chartReportes = new Chart(this.chartReportesCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Recibidos', 'En revisión', 'Atendidos'],
        datasets: [
          {
            label: 'Reportes',
            data: [recibidos, enRevision, atendidos],
            backgroundColor: ['#007476', '#ff9800', '#7da766'],
            borderRadius: 4,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '72%',
        layout: { padding: 6 },
      },
    });
  }

  private renderizarGraficoSolicitudes(solicitudes: Solicitud[]): void {
    const enRevision = solicitudes.filter((s) => s.estadoSolicitud === 'EN_REVISION').length;
    const aprobadas = solicitudes.filter((s) => s.estadoSolicitud === 'APROBADA').length;
    const rechazadas = solicitudes.filter((s) => s.estadoSolicitud === 'RECHAZADA').length;
    this.resumenGraficoSolicitudes = { enRevision, aprobadas, rechazadas };
    console.log('Datos gráfico solicitudes (Ciudadano):', this.resumenGraficoSolicitudes);

    this.cdr.detectChanges();
    if (!this.chartSolicitudesCanvas?.nativeElement) return;
    this.chartSolicitudes?.destroy();

    this.chartSolicitudes = new Chart(this.chartSolicitudesCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['En revisión', 'Aprobadas', 'Rechazadas'],
        datasets: [
          {
            label: 'Solicitudes',
            data: [enRevision, aprobadas, rechazadas],
            backgroundColor: ['#005aa0', '#2d8a65', '#e23737'],
            borderRadius: 6,
            maxBarThickness: 64,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            suggestedMax: 1,
            ticks: { stepSize: 1, precision: 0 },
            title: { display: true, text: 'Cantidad de solicitudes' },
          },
        },
      },
    });
  }

  get totalReportesGrafico(): number {
    const c = this.resumenGraficoReportes;
    return c ? c.recibidos + c.enRevision + c.atendidos : 0;
  }

  porcentajeReportes(cantidad: number): number {
    return this.totalReportesGrafico > 0 ? cantidad / this.totalReportesGrafico : 0;
  }

  abrirMenu(): void {
    console.log('Click en abrir menú móvil (HomeCiudadano)');
    this.menuMobileAbierto = true;
  }

  cerrarMenu(): void {
    console.log('Click en cerrar menú móvil (HomeCiudadano)');
    this.menuMobileAbierto = false;
  }

  cerrarSesion(): void {
    console.log('Cerrando sesión del ciudadano...');
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  imagenError(event: any): void {
    console.log('Imagen no encontrada, aplicando imagen por defecto');
    event.target.src = '/img/evidencia-foto-3.png';
  }

  ngOnDestroy(): void {
    this.chartReportes?.destroy();
    this.chartSolicitudes?.destroy();
  }
}
