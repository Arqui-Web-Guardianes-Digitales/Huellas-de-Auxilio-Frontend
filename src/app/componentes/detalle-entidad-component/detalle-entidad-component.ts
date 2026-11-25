import { AuthService } from '../../services/auth-service';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import * as L from 'leaflet';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap, timeout } from 'rxjs';
import { Entidad } from '../../model/entidad';
import { EntidadService } from '../../services/entidad-service';

@Component({
  selector: 'app-detalle-entidad-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detalle-entidad-component.html',
  styleUrl: './detalle-entidad-component.css',
})
export class DetalleEntidadComponent implements OnInit, OnDestroy {
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }

  private readonly auth = inject(AuthService);
  private readonly entidadService = inject(EntidadService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  menuAbierto = false;
  entidad: Entidad | null = null;
  telefono = '';
  cargando = true;
  cargandoContacto = false;
  error = '';
  errorContacto = '';

  private mapa: L.Map | null = null;
  private marcador: L.Marker | null = null;
  private contenedorMapa: HTMLDivElement | null = null;

  @ViewChild('mapaEntidad')
  set referenciaMapa(referencia: ElementRef<HTMLDivElement> | undefined) {
    this.destruirMapa();
    this.contenedorMapa = referencia?.nativeElement || null;
    this.actualizarMapa();
  }

  private actualizarMapa(): void {
    console.log("Comprobando si se puede mostrar el mapa de la entidad");
    const entidad = this.entidad;

    if (!this.contenedorMapa || !entidad || !this.enlaceMapa) {
      return;
    }

    const coordenadas: L.LatLngTuple = [entidad.latitud!, entidad.longitud!];

    if (!this.mapa) {
      this.mapa = L.map(this.contenedorMapa).setView(coordenadas, 15);
      console.log('Mapa de la entidad inicializado');

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.mapa);

      const icono = L.icon({
        iconUrl: '/icons/map2.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      this.marcador = L.marker(coordenadas, {
        icon: icono,
        draggable: false,
      }).addTo(this.mapa);
    } else {
      this.mapa.setView(coordenadas, 15);
      this.marcador?.setLatLng(coordenadas);
      console.log('Ubicación de la entidad actualizada en el mapa');
    }

    const etiqueta = document.createElement('span');
    etiqueta.textContent = entidad.nombreEntidad;
    this.marcador?.unbindTooltip();
    this.marcador?.bindTooltip(etiqueta);
  }

  private destruirMapa(): void {
    console.log("Liberando el mapa de la entidad");
    this.mapa?.remove();
    this.mapa = null;
    this.marcador = null;
  }

  ngOnDestroy(): void {
    this.destruirMapa();
    this.contenedorMapa = null;
  }

  ngOnInit(): void {
    console.log("Consultando el detalle de la entidad seleccionada");
    this.route.paramMap.pipe(
      switchMap(parametros => {
        const idEntidad = Number(parametros.get('idEntidad'));
        this.entidad = null;
        this.telefono = '';
        this.error = '';
        this.errorContacto = '';
        this.cargando = true;
        this.cargandoContacto = false;
        this.cdr.markForCheck();

        if (!Number.isSafeInteger(idEntidad) || idEntidad <= 0) {
          this.error = 'El identificador de la entidad no es válido.';
console.log("Operación detenida o no confirmada:", this.error);
          this.cargando = false;
          return of(null);
        }

        console.log('Consultando la entidad seleccionada:', idEntidad);
        return this.entidadService.buscarPorId(idEntidad).pipe(
          timeout(20000),
          switchMap(entidad => {
            this.cargando = false;

            if (!entidad || entidad.idEntidad !== idEntidad) {
              this.error = 'No se encontró la entidad seleccionada.';
console.log("Operación detenida o no confirmada:", this.error);
              return of(null);
            }

            this.entidad = entidad;
            console.log('Datos de la entidad seleccionada recibidos:', entidad.idEntidad);
            console.log('Disponibilidad de datos adicionales de la entidad:', { sitioWeb: !!entidad.sitioWeb, diasAtencion: !!entidad.diasAtencion, horaInicio: !!entidad.fechaAtencionInicio, horaFinal: !!entidad.fechaAtencionFinal });
            this.actualizarMapa();
            this.cdr.markForCheck();

            if (!Number.isSafeInteger(entidad.idUsuario) || entidad.idUsuario <= 0) {
              this.errorContacto = 'No se encontró el usuario asociado a esta entidad.';
console.log("Operación detenida o no confirmada:", this.errorContacto);
              return of(null);
            }

            this.cargandoContacto = true;
            this.cdr.markForCheck();

            console.log('Consultando el contacto del usuario de la entidad seleccionada:', entidad.idUsuario);
            return this.entidadService.obtenerContacto(entidad.idUsuario).pipe(
              timeout(20000),
              tap(usuario => {
                this.cargandoContacto = false;
                if (usuario && usuario.idUsuario === entidad.idUsuario) {
                  this.telefono = usuario.telefono || '';
                  console.log('Contacto de la entidad cargado:', { tieneTelefono: !!this.telefono });
                } else {
                  this.errorContacto = 'No se encontró el contacto de esta entidad.';
console.log("Operación detenida o no confirmada:", this.errorContacto);
                }
              }),
              catchError(() => {
                this.cargandoContacto = false;
                this.errorContacto = 'No se pudo cargar el teléfono de esta entidad.';
console.log("Operación detenida o no confirmada:", this.errorContacto);
                return of(null);
              }),
            );
          }),
          catchError(() => {
            this.cargando = false;
            this.error = 'No se pudo cargar la entidad. Verifica tu sesión e inténtalo nuevamente.';
console.log("Operación detenida o no confirmada:", this.error);
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.cdr.markForCheck());
  }

  tieneDatos(valor: string | null | undefined): boolean {
    return valor != null && valor.trim() !== '';
  }

  get tieneContacto(): boolean {
    return this.tieneDatos(this.telefono)
      || this.tieneDatos(this.entidad?.sitioWeb)
      || this.tieneDatos(this.entidad?.zonaAtencion);
  }

  get tieneHorario(): boolean {
    return this.tieneDatos(this.entidad?.diasAtencion)
      || this.tieneDatos(this.entidad?.fechaAtencionInicio)
      || this.tieneDatos(this.entidad?.fechaAtencionFinal);
  }

  get horario(): string {
    const inicio = this.entidad?.fechaAtencionInicio;
    const final = this.entidad?.fechaAtencionFinal;

    if (this.tieneDatos(inicio) && this.tieneDatos(final)) {
      return inicio!.slice(0, 5) + ' - ' + final!.slice(0, 5);
    }

    if (this.tieneDatos(inicio)) {
      return 'Desde las ' + inicio!.slice(0, 5);
    }

    if (this.tieneDatos(final)) {
      return 'Hasta las ' + final!.slice(0, 5);
    }

    return '';
  }

  get enlaceMapa(): string | null {
    const entidad = this.entidad;
    if (!entidad || entidad.latitud == null || entidad.longitud == null
      || !Number.isFinite(entidad.latitud) || !Number.isFinite(entidad.longitud)
      || entidad.latitud < -90 || entidad.latitud > 90
      || entidad.longitud < -180 || entidad.longitud > 180) {
      return null;
    }
    return 'https://www.google.com/maps?q=' + entidad.latitud + ',' + entidad.longitud;
  }

  get enlaceSitioWeb(): string | null {
    const sitio = this.entidad?.sitioWeb?.trim();
    if (!sitio) return null;
    try {
      const url = new URL(sitio.includes('://') ? sitio : 'https://' + sitio);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }

  abrirMenu(): void {
    this.menuAbierto = true;
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

}
