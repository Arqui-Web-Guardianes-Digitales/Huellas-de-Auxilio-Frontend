import { ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { ActualizarReporte, Reporte } from '../../model/reporte';

interface EvidenciaDetalle {
  idEvidencia: number;
  idReporte: number;
  urlEvidencia: string;
  noDisponible?: boolean;
}

@Component({
  selector: 'app-detalle-reporte-entidad-component',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
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
  private readonly fb = inject(FormBuilder);
  private consultaHistorial?: Subscription;
  @ViewChild('confirmacion') private confirmacion?: ElementRef<HTMLDialogElement>;
  estadoForm: FormGroup = this.fb.group({
    nuevoEstado: ['', Validators.required],
    observacion: ['', Validators.maxLength(150)],
  });
  guardando = false;
  errorActualizacion = '';
  mensajeActualizacion = '';
  historial: ActualizarReporte[] = [];
  cargandoHistorial = false;
  errorHistorial = '';
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
            this.cargarHistorial();
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
    this.consultaHistorial?.unsubscribe();
    this.confirmacion?.nativeElement.close();
    this.guardando = false;
    this.estadoForm.reset({ nuevoEstado: '', observacion: '' });
    this.errorActualizacion = '';
    this.mensajeActualizacion = '';
    this.historial = [];
    this.cargandoHistorial = false;
    this.errorHistorial = '';
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

  siguienteEstado(): string {
    return this.reporte?.estado === 'R' ? 'ER' : this.reporte?.estado === 'ER' ? 'AT' : '';
  }

  seleccionarEstado(estado: string): void {
    if (!this.guardando && estado === this.siguienteEstado()) {
      this.estadoForm.patchValue({ nuevoEstado: estado });
    }
  }

  abrirConfirmacion(): void {
    if (this.guardando || !this.comprobarSesion()) return;
    this.errorActualizacion = '';
    this.mensajeActualizacion = '';
    this.estadoForm.markAllAsTouched();
    if (this.estadoForm.invalid || !this.siguienteEstado()
      || this.estadoForm.value.nuevoEstado !== this.siguienteEstado()) {
      this.errorActualizacion = 'Selecciona el siguiente estado permitido.';
      return;
    }
    this.confirmacion?.nativeElement.showModal();
  }

  cerrarConfirmacion(): void {
    if (!this.guardando) this.confirmacion?.nativeElement.close();
  }

  confirmarActualizacion(): void {
    if (this.guardando || !this.reporte || !this.comprobarSesion()) return;
    if (this.estadoForm.invalid || !this.siguienteEstado()
      || this.estadoForm.value.nuevoEstado !== this.siguienteEstado()) return;
    const idReporte = this.idReporte;
    const estado = this.estadoForm.value.nuevoEstado as string;
    const observacion = (this.estadoForm.value.observacion || '').trim();
    this.guardando = true;
    this.errorActualizacion = '';
    this.consultas.add(this.reporteService.actualizarEstado(idReporte, estado, observacion).subscribe({
      next: (reporte) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        if (!reporte || reporte.idReporte !== idReporte || reporte.entidad?.idEntidad !== this.idEntidad
          || reporte.estado !== estado) {
          this.errorActualizacion = 'La respuesta no permite confirmar el cambio. Recarga el reporte antes de reintentar.';
          this.cdr.markForCheck();
          return;
        }
        this.reporte = reporte;
        this.estadoForm.reset({ nuevoEstado: '', observacion: '' });
        this.confirmacion?.nativeElement.close();
        this.mensajeActualizacion = 'Estado actualizado correctamente.';
        this.cargarHistorial();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        if (error.status === 400) {
          this.errorActualizacion = 'Revisa el estado seleccionado y la observación (máximo 150 caracteres).';
        } else if (error.status === 403) {
          this.errorActualizacion = 'Tu cuenta no tiene permiso para actualizar este reporte.';
        } else if (error.status === 404) {
          this.errorActualizacion = 'El reporte ya no existe.';
        } else if (error.status === 409) {
          this.errorActualizacion = 'El estado cambió o la transición no está permitida. Recarga el reporte para consultar su estado actual.';
        } else {
          this.errorActualizacion = 'No se pudo confirmar la actualización. Recarga el reporte antes de reintentar.';
        }
        if (error.status === 401) {
          this.auth.cerrarSesion();
          void this.router.navigateByUrl('/login');
        }
        this.cdr.markForCheck();
      },
    }));
  }

  cargarHistorial(): void {
    if (!this.reporte || !this.comprobarSesion()) return;
    this.consultaHistorial?.unsubscribe();
    this.cargandoHistorial = true;
    this.errorHistorial = '';
    const idReporte = this.idReporte;
    this.consultaHistorial = this.reporteService.obtenerHistorial(idReporte).subscribe({
      next: (lista) => {
        if (!this.comprobarSesion()) return;
        this.cargandoHistorial = false;
        if (!Array.isArray(lista) || lista.some((item) => !item || item.reporteIdReporte !== idReporte
          || !Number.isSafeInteger(item.idActualizacion) || typeof item.descripcionActu !== 'string'
          || !item.fechaActualizacion || Number.isNaN(Date.parse(item.fechaActualizacion)))) {
          this.errorHistorial = 'La API devolvió un historial incompleto.';
        } else {
          this.historial = [...lista].sort((a, b) => Date.parse(b.fechaActualizacion) - Date.parse(a.fechaActualizacion)
            || b.idActualizacion - a.idActualizacion);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.comprobarSesion()) return;
        this.cargandoHistorial = false;
        this.errorHistorial = 'No se pudo cargar el historial del reporte.';
        this.cdr.markForCheck();
      },
    });
  }

  nombreEstado(codigo: string): string {
    return codigo === 'R' ? 'Recibido' : codigo === 'ER' ? 'En revisión' : codigo === 'AT' ? 'Atendido' : codigo || 'No disponible';
  }

  cambioHistorial(descripcion: string): string {
    const cambio = descripcion.match(/^Estado: (R|ER|AT) → (R|ER|AT)(?:\. Observación: |$)/);
    if (!cambio) return descripcion;
    return this.nombreEstado(cambio[1]) + ' → ' + this.nombreEstado(cambio[2]);
  }

  observacionHistorial(descripcion: string): string {
    const cambio = descripcion.match(/^Estado: (R|ER|AT) → (R|ER|AT)\. Observación: /);
    return cambio ? descripcion.slice(cambio[0].length) : '';
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
    this.consultaHistorial?.unsubscribe();
    this.consultas.unsubscribe();
    this.mapa?.remove();
  }
}
