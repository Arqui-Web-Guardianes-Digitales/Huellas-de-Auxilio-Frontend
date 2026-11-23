import * as L from 'leaflet';
import { AuthService } from '../../services/auth-service';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Entidad } from '../../model/entidad';
import { EntidadService } from '../../services/entidad-service';

@Component({
  selector: 'app-directorio-component',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './directorio-component.html',
  styleUrl: './directorio-component.css',
})
export class DirectorioComponent implements OnInit, OnDestroy {
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }

  private readonly auth = inject(AuthService);
  private readonly entidadService = inject(EntidadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  menuAbierto = false;
  busqueda = '';
  distrito = '';
  tipo = '';
  entidades: Entidad[] = [];
  entidadSeleccionada: Entidad | null = null;
  cargando = true;
  error = '';

  private mapa: L.Map | null = null;
  private marcador: L.Marker | null = null;
  private contenedorMapa: HTMLDivElement | null = null;
  private ubicacionMostrada = '';

  @ViewChild('mapaDirectorio')
  set referenciaMapa(referencia: ElementRef<HTMLDivElement> | undefined) {
    this.destruirMapa();
    this.contenedorMapa = referencia?.nativeElement || null;
    this.actualizarMapa();
  }

  actualizarMapa(): void {
    const entidad = this.entidadVisible;
    if (!this.contenedorMapa || !entidad || !this.enlaceMapa) {
      this.destruirMapa();
      return;
    }
    const ubicacion = JSON.stringify([entidad.idEntidad, entidad.latitud, entidad.longitud, entidad.nombreEntidad]);
    if (this.ubicacionMostrada === ubicacion) return;
    const coordenadas: L.LatLngTuple = [entidad.latitud!, entidad.longitud!];
    if (!this.mapa) {
      this.mapa = L.map(this.contenedorMapa).setView(coordenadas, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.mapa);
      const icono = L.icon({
        iconUrl: '/icons/map2.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      this.marcador = L.marker(coordenadas, { icon: icono, draggable: false }).addTo(this.mapa);
      console.log('Mapa del directorio inicializado');
    } else {
      this.mapa.setView(coordenadas, 15);
      this.marcador?.setLatLng(coordenadas);
    }
    const etiqueta = document.createElement('span');
    etiqueta.textContent = entidad.nombreEntidad;
    this.marcador?.unbindTooltip();
    this.marcador?.bindTooltip(etiqueta);
    this.ubicacionMostrada = ubicacion;
    console.log('Mapa actualizado con la ubicación de la entidad:', entidad.idEntidad);
  }

  private destruirMapa(): void {
    if (this.mapa) {
      this.mapa.remove();
      console.log('Mapa del directorio liberado');
    }
    this.mapa = null;
    this.marcador = null;
    this.ubicacionMostrada = '';
  }

  seleccionarConTeclado(evento: Event, entidad: Entidad): void {
    if (evento.target !== evento.currentTarget) return;
    evento.preventDefault();
    this.seleccionarEntidad(entidad);
  }

  ngOnDestroy(): void {
    this.destruirMapa();
    this.contenedorMapa = null;
  }

  ngOnInit(): void {
    this.cargarEntidades();
  }

  cargarEntidades(): void {
    console.log("Consultando los datos de las entidades del directorio");
    this.cargando = true;
    this.error = '';
    this.entidades = [];
    this.entidadSeleccionada = null;

    this.entidadService.listarEntidades().pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (entidades) => {
        console.log('Entidades recibidas para el directorio:', entidades.length);
        this.entidades = entidades;
        this.cargando = false;
        this.cdr.markForCheck();

        for (const entidad of this.entidades) {
          console.log('Consultando el contacto del usuario de la entidad:', entidad.idUsuario);
          this.entidadService.obtenerContacto(entidad.idUsuario).pipe(
            timeout(20000),
            takeUntilDestroyed(this.destroyRef),
          ).subscribe({
            next: (usuario) => {
              console.log('Consulta del contacto de la entidad finalizada:', { idEntidad: entidad.idEntidad, tieneTelefono: !!usuario?.telefono });
              if (usuario != null) {
                entidad.telefono = usuario.telefono;
              }
              this.cdr.markForCheck();
            },
            error: () => {
              console.log('No se pudo consultar el contacto de la entidad:', entidad.idEntidad);
              this.cdr.markForCheck();
            },
          });
        }
      },
      error: () => {
        console.log("Error durante la operación: consultando los datos de las entidades del directorio");
        this.error = 'No se pudo cargar el directorio. Verifica tu sesión e inténtalo nuevamente.';
        console.log("Operación detenida o no confirmada:", this.error);
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  abrirMenu(): void {
    this.menuAbierto = true;
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  get zonas(): string[] {
    return [...new Set(this.entidades.map(entidad => entidad.zonaAtencion).filter(zona => !!zona))].sort();
  }

  get tipos(): string[] {
    return [...new Set(this.entidades.map(entidad => entidad.tipoEntidad).filter(tipo => !!tipo))].sort();
  }

  get entidadesFiltradas(): Entidad[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.entidades.filter(entidad => {
      const nombre = (entidad.nombreEntidad || '').toLowerCase();
      const zona = (entidad.zonaAtencion || '').toLowerCase();
      const tipo = (entidad.tipoEntidad || '').toLowerCase();
      const coincideTexto = nombre.includes(texto) || zona.includes(texto) || tipo.includes(texto);
      const coincideDistrito = this.distrito === '' || entidad.zonaAtencion === this.distrito;
      const coincideTipo = this.tipo === '' || entidad.tipoEntidad === this.tipo;
      return coincideTexto && coincideDistrito && coincideTipo;
    });
  }

  limpiarFiltrosDirectorio(): void {
    console.log("Limpiando los filtros del directorio");
    this.busqueda = '';
    this.distrito = '';
    this.tipo = '';
    this.entidadSeleccionada = null;
    this.actualizarMapa();
  }

  seleccionarEntidad(entidad: Entidad): void {
    console.log("Seleccionando una entidad del directorio");
    this.entidadSeleccionada = entidad;
    this.actualizarMapa();
  }

  get entidadVisible(): Entidad | null {
    const entidades = this.entidadesFiltradas;
    return entidades.find(entidad => entidad.idEntidad === this.entidadSeleccionada?.idEntidad)
      || entidades[0] || null;
  }

  get enlaceMapa(): string | null {
    const entidad = this.entidadVisible;
    if (!entidad || entidad.latitud == null || entidad.longitud == null
      || !Number.isFinite(entidad.latitud) || !Number.isFinite(entidad.longitud)
      || entidad.latitud < -90 || entidad.latitud > 90
      || entidad.longitud < -180 || entidad.longitud > 180) {
      return null;
    }
    return 'https://www.google.com/maps?q=' + entidad.latitud + ',' + entidad.longitud;
  }
}
