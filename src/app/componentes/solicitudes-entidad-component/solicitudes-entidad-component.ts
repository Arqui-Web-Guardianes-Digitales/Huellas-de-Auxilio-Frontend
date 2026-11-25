import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, isDevMode } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { SolicitudService } from '../../services/solicitud-service';
import { Mascota } from '../../model/mascota';
import { Solicitud } from '../../model/solicitud';

@Component({
  selector: 'app-solicitudes-entidad-component',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './solicitudes-entidad-component.html',
  styleUrl: './solicitudes-entidad-component.css',
})
export class SolicitudesEntidadComponent implements OnInit {
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }

  private readonly auth = inject(AuthService);
  readonly mascotaService = inject(MascotaService);
  private readonly solicitudesService = inject(SolicitudService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private tokenSesion: string | null = null;
  private idEntidad: number | null = null;
  readonly general = !this.route.snapshot.paramMap.has('idMascota');
  readonly idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));
  filtrosForm = this.fb.group({ codigo: [''], estado: [''], especie: [''] });
  nombreEntidad = '';
  menuMobileAbierto = false;
  cargando = true;
  error = '';
  mascota: Mascota | null = null;
  solicitudes: Solicitud[] = [];
  solicitudesFiltradas: Solicitud[] = [];
  solicitudesPagina: Solicitud[] = [];
  paginaActual = 1;
  paginas: number[] = [];
  readonly porPagina = 6;

  ngOnInit(): void {

    this.tokenSesion = this.auth.token();
    if (!this.tokenSesion || !this.auth.correoEntidad() || !this.auth.roles().includes('ROLE_ENTIDAD')) {
      this.cargando = false;
      void this.router.navigateByUrl('/login');
      return;
    }
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.aplicarFiltros());
    this.auth.limpiarDatosEntidad();
    this.auth.obtenerPerfilEntidadDB().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entidad) => {

        if (!this.comprobarSesion()) return;
        if (!entidad) { this.mostrarError('No se encontró el perfil de tu entidad.'); return; }
        this.idEntidad = entidad.idEntidad!;
        this.nombreEntidad = entidad.nombreEntidad;
        this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
        if (this.general) this.cargarSolicitudes();
        else this.cargarMascota();
      },
      error: (error: HttpErrorResponse) => (this.errorPeticion(error)),
    });
  }

  private cargarMascota(): void {

    if (!Number.isSafeInteger(this.idMascota) || this.idMascota <= 0) {
      this.mostrarError('El identificador de mascota no es válido.'); return;
    }
    this.mascotaService.buscarPorId(this.idMascota).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (mascota) => {

        if (!this.comprobarSesion()) return;
        if (!mascota || mascota.entidadIdEntidad !== this.idEntidad) {
          this.mostrarError('No se encontró una mascota de tu entidad con ese identificador.'); return;
        }
        this.mascota = mascota;
        this.cargarSolicitudes();
      },
      error: (error: HttpErrorResponse) => (this.errorPeticion(error)),
    });
  }

  private cargarSolicitudes(): void {

    (this.general ? this.solicitudesService.listarPorEntidad(this.idEntidad!)
      : this.solicitudesService.listarPorMascota(this.idMascota)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (datos) => {

        if (!this.comprobarSesion()) return;
        if (!Array.isArray(datos) || (!this.general && datos.some(s => s.mascotaIdMascota !== this.idMascota))) {
          this.mostrarError('El servidor no devolvió las solicitudes de la mascota seleccionada.'); return;
        }
        this.solicitudes = [...datos].sort((a, b) =>
          (b.fechaSolicitud || '').localeCompare(a.fechaSolicitud || '') || (b.idSolicitud || 0) - (a.idSolicitud || 0));
        this.cargando = false;
        if (isDevMode()) console.log(`[${this.general ? 'HU31' : 'HU30'}] Solicitudes consultadas correctamente.`);
        this.aplicarFiltros();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => (this.errorPeticion(error)),
    });
  }

  aplicarFiltros(): void {

    const filtros = this.filtrosForm.value;
    const codigo = (filtros.codigo || '').trim().toLowerCase();
    this.solicitudesFiltradas = this.solicitudes.filter(s =>
      ('sol-' + s.idSolicitud).toLowerCase().includes(codigo)
      && (!filtros.estado || s.estadoSolicitud === filtros.estado)
      && (!filtros.especie || s.especieMascota?.toLowerCase() === filtros.especie));
    this.cambiarPagina(1);
    if (isDevMode() && this.filtrosForm.dirty) console.log(`[${this.general ? 'HU31' : 'HU30'}] Filtros aplicados.`);
  }

  limpiarFiltros(): void {
     this.filtrosForm.reset({ codigo: '', estado: '', especie: '' }); }
  cambiarPagina(pagina: number): void {

    const cantidad = Math.ceil(this.solicitudesFiltradas.length / this.porPagina);
    this.paginas = Array.from({ length: cantidad }, (_, i) => i + 1);
    this.paginaActual = Math.max(1, Math.min(pagina, cantidad || 1));
    this.solicitudesPagina = this.solicitudesFiltradas.slice((this.paginaActual - 1) * this.porPagina, this.paginaActual * this.porPagina);
  }
  etiquetaEstado(estado?: string): string {
    switch (estado) {
      case 'EN_REVISION': return 'En revisión';
      case 'APROBADA': return 'Aprobado';
      case 'RECHAZADA': return 'Rechazado';
      default: return 'Estado no disponible';
    }
  }
  private comprobarSesion(): boolean {
    if (this.tokenSesion && this.auth.token() === this.tokenSesion && this.auth.correoEntidad()
      && this.auth.roles().includes('ROLE_ENTIDAD')
      && (this.idEntidad === null || this.auth.idEntidad() === this.idEntidad)) return true;
    this.solicitudes = []; this.solicitudesFiltradas = []; this.solicitudesPagina = [];
    this.mascota = null; this.nombreEntidad = '';
    this.mostrarError('La sesión cambió o caducó. Vuelve a iniciar sesión.');
    return false;
  }
  private errorPeticion(error: HttpErrorResponse): void {
    if (isDevMode()) console.error(error instanceof HttpErrorResponse ? `[Solicitudes] Error HTTP ${error.status}.` : '[Solicitudes] No se pudo completar la consulta.');
    if (!this.comprobarSesion()) return;
    this.mostrarError(error.status === 403 ? 'Solo puedes consultar solicitudes de tu entidad.'
      : 'No se pudieron cargar las solicitudes. Regresa a Adopciones e intenta nuevamente.');
    if (error.status === 401) { this.auth.cerrarSesion(); void this.router.navigateByUrl('/login'); }
  }
  private mostrarError(mensaje: string): void {
    this.error = mensaje; this.cargando = false; this.solicitudesPagina = [];
    this.cdr.markForCheck();
  }
  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }
}
