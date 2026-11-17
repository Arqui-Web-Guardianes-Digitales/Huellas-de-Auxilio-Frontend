import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { Mascota } from '../../model/mascota';

@Component({
  selector: 'app-adopciones-entidad-component',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './adopciones-entidad-component.html',
  styleUrl: './adopciones-entidad-component.css',
})
export class AdopcionesEntidadComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly mascotaService = inject(MascotaService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private tokenSesion: string | null = null;
  private idEntidad: number | null = null;

  filtrosForm: FormGroup = this.fb.group({ nombre: [''], especie: [''], edad: [''] });
  menuMobileAbierto = false;
  nombreEntidad = '';
  cargando = true;
  error = '';
  mascotas: Mascota[] = [];
  mascotasFiltradas: Mascota[] = [];
  mascotasPagina: Mascota[] = [];
  paginaActual = 1;
  paginas: number[] = [];
  readonly porPagina = 6;

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !Array.isArray(roles) || !roles.includes('ROLE_ENTIDAD')) {
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
    this.auth.limpiarDatosEntidad();
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.aplicarFiltros();
    });
    this.auth.obtenerPerfilEntidadDB().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entidad) => {
        if (!this.comprobarSesion()) return;
        if (!entidad) {
          this.cargando = false;
          this.error = 'No se encontró un perfil de entidad asociado a tu cuenta.';
          this.cdr.markForCheck();
          return;
        }
        this.idEntidad = entidad.idEntidad!;
        this.nombreEntidad = entidad.nombreEntidad.trim();
        this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
        this.cargarMascotas(this.idEntidad);
      },
      error: (error: HttpErrorResponse | Error) => this.mostrarError(error),
    });
  }

  private cargarMascotas(idEntidad: number): void {
    this.mascotaService.listarPorEntidad(idEntidad).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => {
        if (!this.comprobarSesion()) return;
        this.cargando = false;
        if (!Array.isArray(lista) || lista.some((mascota) => !mascota
          || !Number.isSafeInteger(mascota.idMascota) || mascota.idMascota <= 0
          || mascota.entidadIdEntidad !== idEntidad || typeof mascota.estado !== 'boolean'
          || typeof mascota.nombre !== 'string' || typeof mascota.especie !== 'string'
          || typeof mascota.edad !== 'string')) {
          this.error = 'La API no devolvió un listado válido de mascotas de tu entidad.';
          this.cdr.markForCheck();
          return;
        }
        this.mascotas = lista.filter((mascota) => mascota.estado === true)
          .sort((a, b) => b.idMascota - a.idMascota);
        this.aplicarFiltros();
      },
      error: (error: HttpErrorResponse | Error) => this.mostrarError(error),
    });
  }

  aplicarFiltros(): void {
    if (!this.comprobarSesion()) return;
    const nombre = (this.filtrosForm.value.nombre || '').trim().toLowerCase();
    const especie = this.filtrosForm.value.especie || '';
    const edad = this.filtrosForm.value.edad || '';
    this.mascotasFiltradas = this.mascotas.filter((mascota) =>
      mascota.nombre.toLowerCase().includes(nombre)
      && (!especie || mascota.especie.trim().toLowerCase() === especie)
      && (!edad || mascota.edad.trim().toLowerCase() === edad),
    );
    this.paginas = Array.from({ length: Math.ceil(this.mascotasFiltradas.length / this.porPagina) }, (_, i) => i + 1);
    this.cambiarPagina(1);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ nombre: '', especie: '', edad: '' }, { emitEvent: false });
    this.aplicarFiltros();
  }

  cambiarPagina(pagina: number): void {
    if (!this.comprobarSesion()) return;
    this.paginaActual = Math.max(1, Math.min(pagina, this.paginas.length || 1));
    const inicio = (this.paginaActual - 1) * this.porPagina;
    this.mascotasPagina = this.mascotasFiltradas.slice(inicio, inicio + this.porPagina);
    this.cdr.markForCheck();
  }

  private comprobarSesion(): boolean {
    const roles = this.auth.roles();
    if (this.tokenSesion && this.auth.token() === this.tokenSesion && this.auth.correoEntidad()
      && Array.isArray(roles) && roles.includes('ROLE_ENTIDAD')
      && (this.idEntidad === null || this.auth.idEntidad() === this.idEntidad)) return true;
    this.cargando = false;
    this.nombreEntidad = '';
    this.mascotas = [];
    this.mascotasFiltradas = [];
    this.mascotasPagina = [];
    this.paginas = [];
    this.error = 'La sesión cambió o caducó. Vuelve a iniciar sesión para consultar tus mascotas.';
    this.cdr.markForCheck();
    return false;
  }

  private mostrarError(error: HttpErrorResponse | Error): void {
    if (!this.comprobarSesion()) return;
    this.cargando = false;
    this.error = 'No se pudieron cargar las mascotas de tu entidad. Intenta recargar la página.';
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.auth.cerrarSesion();
      void this.router.navigateByUrl('/login');
    }
    this.cdr.markForCheck();
  }

  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }
}
