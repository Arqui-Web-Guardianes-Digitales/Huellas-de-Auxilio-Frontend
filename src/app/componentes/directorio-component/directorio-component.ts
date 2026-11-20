import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
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
export class DirectorioComponent implements OnInit {
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

  ngOnInit(): void {
    this.cargarEntidades();
  }

  cargarEntidades(): void {
    this.cargando = true;
    this.error = '';
    this.entidades = [];
    this.entidadSeleccionada = null;

    this.entidadService.listarEntidades().pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (entidades) => {
        this.entidades = entidades;
        this.cargando = false;
        this.cdr.markForCheck();

        for (const entidad of this.entidades) {
          this.entidadService.obtenerContacto(entidad.idUsuario).pipe(
            timeout(20000),
            takeUntilDestroyed(this.destroyRef),
          ).subscribe({
            next: (usuario) => {
              if (usuario != null) {
                entidad.telefono = usuario.telefono;
              }
              this.cdr.markForCheck();
            },
            error: () => {
              this.cdr.markForCheck();
            },
          });
        }
      },
      error: () => {
        this.error = 'No se pudo cargar el directorio. Verifica tu sesión e inténtalo nuevamente.';
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
    this.busqueda = '';
    this.distrito = '';
    this.tipo = '';
    this.entidadSeleccionada = null;
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada = entidad;
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
