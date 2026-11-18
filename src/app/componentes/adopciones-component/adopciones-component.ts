import { Component, OnInit, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';

import { Mascota } from '../../model/mascota';
import { MascotaService } from '../../services/mascota-service';
import { AuthService } from '../../services/auth-service';

interface FiltrosMascotas {
  nombre: string;
  especie: string;
  edad: string;
  distrito: string;
}

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-adopciones-component',
  templateUrl: './adopciones-component.html',
  styleUrl: './adopciones-component.css',
})
export class AdopcionesComponent implements OnInit {
  private readonly mascotaService = inject(MascotaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consultas = new Subject<FiltrosMascotas>();

  urlFotoMascota(url?: string | null): string {
    return this.mascotaService.urlFotoMascota(url);
  }

  mostrarFotoDeRespaldo(evento: Event): void {
    this.mascotaService.mostrarFotoDeRespaldo(evento);
  }


  menuAbierto = false;
  nombreCiudadano = 'Ciudadano';
  filtros: FiltrosMascotas = { nombre: '', especie: '', edad: '', distrito: '' };
  especies: string[] = [];
  edades: string[] = [];
  distritos: string[] = [];
  mascotas: Mascota[] = [];
  cargando = true;
  filtrosAplicados = false;
  error = '';
  pagina = 1;
  readonly tarjetasPorPagina = 6;

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.nombreCiudadano = this.auth.nombreCiudadano();

    this.consultas.pipe(
      switchMap(({ nombre, especie, edad, distrito }) => {
        const filtrando = Boolean(nombre || especie || edad || distrito);
        this.cargando = true;
        this.error = '';
        this.pagina = 1;
        this.filtrosAplicados = filtrando;

        const peticion = filtrando
          ? this.mascotaService.filtrarMascotas(nombre, especie, edad, distrito)
          : this.mascotaService.listarDisponibles();

        return peticion.pipe(
          map((mascotas) => ({ mascotas: mascotas ?? [], filtrando, fallo: false })),
          catchError(() => of({ mascotas: [] as Mascota[], filtrando, fallo: true })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ mascotas, filtrando, fallo }) => {
      this.mascotas = mascotas;
      this.cargando = false;
      if (fallo) {
        this.error = 'No se pudieron cargar las mascotas. Vuelve a intentar la búsqueda.';
      } else if (!filtrando) {
        // Las opciones salen del listado completo, no del resultado filtrado.
        this.especies = this.opcionesDe(mascotas, 'especie');
        this.edades = this.opcionesDe(mascotas, 'edad');
        this.distritos = this.opcionesDe(mascotas, 'distrito');
      }
      this.cdr.markForCheck();
    });

    this.buscarMascotas();
  }

  buscarMascotas(): void {
    this.consultas.next({ ...this.filtros, nombre: this.filtros.nombre.trim() });
  }

  cambiarFiltro(campo: 'especie' | 'edad' | 'distrito', valor: string): void {
    this.filtros[campo] = valor;
    this.buscarMascotas();
  }

  limpiarFiltros(): void {
    this.filtros = { nombre: '', especie: '', edad: '', distrito: '' };
    this.buscarMascotas();
  }

  get totalPaginas(): number {
    return Math.ceil(this.mascotas.length / this.tarjetasPorPagina);
  }

  get mascotasVisibles(): Mascota[] {
    const desde = (this.pagina - 1) * this.tarjetasPorPagina;
    return this.mascotas.slice(desde, desde + this.tarjetasPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.pagina = pagina;
  }

  private opcionesDe(mascotas: Mascota[], campo: 'especie' | 'edad' | 'distrito'): string[] {
    const opciones = new Map<string, string>();
    for (const mascota of mascotas) {
      const valor = mascota[campo]?.trim();
      if (valor) opciones.set(valor.toLowerCase(), valor);
    }
    return [...opciones.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }
}
