import { ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Reporte } from '../../model/reporte';

interface EvidenciaDetalle {
  idEvidencia: number;
  idReporte: number;
  urlEvidencia: string;
  noDisponible?: boolean;
}

@Component({
  selector: 'app-detalle-reporte-entidad-component',
  imports: [RouterLink, DatePipe],
  templateUrl: './detalle-reporte-entidad-component.html',
  styleUrl: './detalle-reporte-entidad-component.css',
})
export class DetalleReporteEntidadComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private consultas = new Subscription();
  private mapa?: L.Map;
  private tokenSesion: string | null = null;
  private idReporte = 0;
  private idEntidad: number | null = null;

  menuMobileAbierto = false;
  nombreEntidad = '';
  cargando = true;
  error = '';
  mensajeCopia = '';
  reporte: Reporte | null = null;
  fechaReporte: string | null = null;
  tieneCoordenadas = false;
  errorMapa = '';
  evidencias: EvidenciaDetalle[] = [];
  cargandoEvidencias = false;
  errorEvidencias = '';
  parametrosRegreso: Record<string, string> = {};

  // El contenedor aparece después de recibir el reporte, sin temporizadores.
  @ViewChild('mapaReporte')
  set contenedorMapa(elemento: ElementRef<HTMLDivElement> | undefined) {
    if (elemento && this.tieneCoordenadas && !this.mapa) this.iniciarMapa(elemento.nativeElement);
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      this.cargarDetalle(parametros.get('id'));
    });
  }

  private cargarDetalle(id: string | null): void {
    this.consultas.unsubscribe();
    this.consultas = new Subscription();
    this.limpiarDetalle();
    this.idEntidad = null;
    this.nombreEntidad = '';
    this.cargando = true;
    this.error = '';
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !this.auth.correoEntidad()
      || !Array.isArray(roles) || !roles.includes('ROLE_ENTIDAD')) {
      this.cargando = false;
      void this.router.navigateByUrl('/login');
      return;
    }
    for (const clave of ['codigo', 'estado', 'urgencia', 'distrito', 'pagina', 'porPagina']) {
      this.parametrosRegreso[clave] = this.route.snapshot.queryParamMap.get(clave) || '';
    }
    this.idReporte = Number(id);
    if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(this.idReporte)) {
      this.cargando = false;
      this.error = 'El identificador del reporte no es válido.';
      return;
    }
    this.auth.limpiarDatosEntidad();
    const idReporte = this.idReporte;
    this.consultas.add(this.auth.obtenerPerfilEntidadDB().subscribe({
      next: (entidad) => {
        if (!this.comprobarSesion()) return;
        if (!entidad || !Number.isSafeInteger(entidad.idEntidad) || entidad.idEntidad! <= 0) {
          this.mostrarMensaje('No se encontró un perfil de entidad válido asociado a tu cuenta.');
          return;
        }
        this.idEntidad = entidad.idEntidad!;
        this.nombreEntidad = entidad.nombreEntidad.trim();
        this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
        this.consultas.add(this.reporteService.obtenerReporteEntidadPorId(idReporte).subscribe({
          next: (reporte) => {
            if (!this.comprobarSesion()) return;
            if (!reporte) {
              this.mostrarMensaje('El reporte solicitado no existe.');
              return;
            }
            if (reporte.idReporte !== idReporte || !reporte.entidad?.idEntidad) {
              this.mostrarMensaje('La API devolvió un reporte incompleto o diferente del solicitado.');
              return;
            }
            if (reporte.entidad.idEntidad !== this.idEntidad) {
              this.mostrarMensaje('Este reporte no está asignado a tu entidad.');
              return;
            }
            this.reporte = reporte;
            this.fechaReporte = reporte.fechaReporte && !Number.isNaN(Date.parse(reporte.fechaReporte))
              ? reporte.fechaReporte : null;
            const lat = reporte.ubicacion?.latitud;
            const lng = reporte.ubicacion?.longitud;
            this.tieneCoordenadas = typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90
              && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
            this.cargando = false;
            this.cargarEvidencias(idReporte);
            this.cdr.markForCheck();
          },
          error: (error: HttpErrorResponse | Error) => this.mostrarError(error),
        }));
      },
      error: (error: HttpErrorResponse | Error) => this.mostrarError(error),
    }));
  }

  private cargarEvidencias(idReporte: number): void {
    this.cargandoEvidencias = true;
    this.consultas.add(this.reporteService.obtenerEvidencias(idReporte).subscribe({
      next: (lista) => {
        if (!this.comprobarSesion()) return;
        this.cargandoEvidencias = false;
        if (!Array.isArray(lista) || lista.some((evidencia) => !evidencia
          || evidencia.idReporte !== idReporte || !Number.isSafeInteger(evidencia.idEvidencia)
          || typeof evidencia.urlEvidencia !== 'string' || !evidencia.urlEvidencia.trim())) {
          this.errorEvidencias = 'La API no devolvió evidencias válidas para este reporte.';
        } else {
          this.evidencias = lista.map((evidencia) => ({ ...evidencia, noDisponible: false }));
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse | Error) => {
        if (!this.comprobarSesion()) return;
        this.cargandoEvidencias = false;
        this.errorEvidencias = 'No se pudieron consultar las evidencias del reporte.';
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.mostrarError(error);
        }
        this.cdr.markForCheck();
      },
    }));
  }

  private comprobarSesion(): boolean {
    const roles = this.auth.roles();
    if (this.tokenSesion && this.auth.token() === this.tokenSesion && this.auth.correoEntidad()
      && Array.isArray(roles) && roles.includes('ROLE_ENTIDAD')
      && (this.idEntidad === null || this.auth.idEntidad() === this.idEntidad)) return true;
    this.mostrarMensaje('La sesión cambió o caducó. Vuelve a iniciar sesión para consultar el reporte.');
    return false;
  }

  private mostrarMensaje(mensaje: string): void {
    this.limpiarDetalle();
    this.nombreEntidad = '';
    this.cargando = false;
    this.error = mensaje;
    this.cdr.markForCheck();
  }

  private mostrarError(error: HttpErrorResponse | Error): void {
    if (!this.comprobarSesion()) return;
    this.mostrarMensaje(error instanceof HttpErrorResponse && error.status === 404
      ? 'El reporte solicitado no existe.' : 'No se pudo cargar el detalle del reporte. Intenta recargar la página.');
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.auth.cerrarSesion();
      void this.router.navigateByUrl('/login');
    }
  }

  private iniciarMapa(contenedor: HTMLDivElement): void {
    if (!this.comprobarSesion() || !this.tieneCoordenadas || !this.reporte?.ubicacion) return;
    const { latitud, longitud } = this.reporte.ubicacion;
    this.mapa = L.map(contenedor, { zoomControl: false, dragging: false, scrollWheelZoom: false })
      .setView([latitud, longitud], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).on('tileerror', () => {
      if (!this.comprobarSesion()) return;
      this.errorMapa = 'No se pudo cargar parte del mapa. La dirección y las coordenadas siguen disponibles.';
      this.cdr.markForCheck();
    }).addTo(this.mapa);
    const icono = L.icon({ iconUrl: '/icons/map2.png', iconSize: [36, 36], iconAnchor: [18, 36] });
    L.marker([latitud, longitud], { icon: icono }).addTo(this.mapa);
  }

  private limpiarDetalle(): void {
    this.mensajeCopia = '';
    this.mapa?.remove();
    this.mapa = undefined;
    this.reporte = null;
    this.fechaReporte = null;
    this.evidencias = [];
    this.cargandoEvidencias = false;
    this.errorEvidencias = '';
    this.tieneCoordenadas = false;
    this.errorMapa = '';
  }

  async copiarCodigo(codigo: string): Promise<void> {
    const reporte = this.reporte;
    let mensaje: string;
    try {
      await navigator.clipboard.writeText(codigo);
      mensaje = 'Código copiado.';
    } catch {
      mensaje = 'No se pudo copiar. Puedes seleccionar el código y copiarlo manualmente.';
    }
    if (this.reporte === reporte) {
      this.mensajeCopia = mensaje;
      this.cdr.markForCheck();
    }
  }

  nombreEstado(codigo: string): string {
    return codigo === 'R' ? 'Recibido' : codigo === 'ER' ? 'En revisión' : codigo === 'AT' ? 'Atendido' : codigo || 'No disponible';
  }

  nombreUrgencia(codigo: string): string {
    return codigo === 'AL' ? 'Alta' : codigo === 'ME' ? 'Media' : codigo === 'BA' ? 'Baja' : codigo || 'No disponible';
  }

  nombreTipoCaso(codigo: string): string {
    return codigo === 'M' ? 'Maltrato' : codigo === 'A' ? 'Abandono' : codigo || 'No disponible';
  }

  imagenNoDisponible(evidencia: EvidenciaDetalle): void {
    evidencia.noDisponible = true;
  }

  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }

  ngOnDestroy(): void {
    this.consultas.unsubscribe();
    this.mapa?.remove();
  }
}
