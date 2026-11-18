import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { ReporteService } from '../../services/reporte-service';
import { Mascota } from '../../model/mascota';

function edadPositiva(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === '') return null;
  const cantidad = Number(control.value);
  return Number.isFinite(cantidad * 12) && cantidad > 0 ? null : { edadInvalida: true };
}

@Component({
  selector: 'app-publicar-mascota-component',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './publicar-mascota-component.html',
  styleUrl: './publicar-mascota-component.css',
})
export class PublicarMascotaComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly mascotaService = inject(MascotaService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  edicion = this.route.snapshot.paramMap.has('idMascota');
  private idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));
  edadAnterior = '';
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private tokenSesion: string | null = null;
  private idEntidad: number | null = null;
  private archivo: File | null = null;
  private revisionFoto = 0;
  private urlFoto = '';

  readonly distritos = ['San Miguel', 'Miraflores', 'San Borja', 'Surco', 'Jesús María', 'Pueblo Libre', 'Lince'];
  mascotaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    especie: ['', [Validators.required, Validators.pattern(/^(Perro|Gato)$/)]],
    edad: [null, [Validators.required, edadPositiva]],
    unidadEdad: ['meses', [Validators.required, Validators.pattern(/^(meses|años)$/)]],
    sexo: ['', [Validators.required, Validators.pattern(/^(Macho|Hembra)$/)]],
    distrito: ['', [Validators.required, Validators.pattern(/^(San Miguel|Miraflores|San Borja|Surco|Jesús María|Pueblo Libre|Lince)$/)]],
    tamaño: ['', [Validators.required, Validators.pattern(/^(Pequeño|Mediano|Grande)$/)]],
    descripcion: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    foto: ['', Validators.required],
  });

  menuMobileAbierto = false;
  nombreEntidad = '';
  cargando = true;
  guardando = false;
  leyendoFoto = false;
  errorSesion = '';
  error = '';
  errorFoto = '';
  vistaPrevia = '';
  mascotaPublicada: Mascota | null = null;

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !this.auth.correoEntidad() || !Array.isArray(roles) || !roles.includes('ROLE_ENTIDAD')) {
      this.cargando = false;
      void this.router.navigateByUrl('/login');
      return;
    }
    this.auth.limpiarDatosEntidad();
    this.auth.obtenerPerfilEntidadDB().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entidad) => {
        if (!this.comprobarSesion()) return;
        this.cargando = false;
        if (!entidad) {
          this.errorSesion = 'No se encontró un perfil de entidad asociado a tu cuenta.';
        } else {
          this.idEntidad = entidad.idEntidad!;
          this.nombreEntidad = entidad.nombreEntidad.trim();
          this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
          if (this.edicion) this.cargarMascota();
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse | Error) => {
        if (!this.comprobarSesion()) return;
        this.cargando = false;
        this.errorSesion = 'No se pudo cargar tu perfil de entidad. Intenta recargar la página.';
        this.tratarAutenticacion(error);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarMascota(): void {
    if (!Number.isSafeInteger(this.idMascota) || this.idMascota <= 0) {
      this.errorSesion = 'El identificador de mascota no es válido.';
      return;
    }
    this.cargando = true;
    this.mascotaService.buscarPorId(this.idMascota).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (mascota) => {
        if (!this.comprobarSesion()) return;
        this.cargando = false;
        if (!mascota || mascota.entidadIdEntidad !== this.idEntidad) {
          this.errorSesion = 'No se encontró una mascota de tu entidad con ese identificador.';
        } else {
          this.cargarFormulario(mascota);
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        if (!this.comprobarSesion()) return;
        this.cargando = false;
        this.errorSesion = 'No se pudo cargar la mascota. Regresa a Adopciones e intenta nuevamente.';
        this.tratarAutenticacion(error);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarFormulario(mascota: Mascota): void {
    this.quitarFoto();
    const edad = mascota.edad.trim().toLowerCase();
    const partes = edad.match(/^([0-9]+(?:[.,][0-9]+)?(?:e[+-]?[0-9]+)?)\s+(mes|meses|año|años)$/);
    this.edadAnterior = partes ? '' : mascota.edad;
    this.mascotaForm.get('edad')!.setValidators(this.edadAnterior ? [edadPositiva] : [Validators.required, edadPositiva]);
    this.mascotaForm.patchValue({
      nombre: mascota.nombre, especie: mascota.especie, sexo: mascota.sexo,
      edad: partes ? Number(partes[1].replace(',', '.')) : null,
      unidadEdad: partes && partes[2].startsWith('año') ? 'años' : 'meses',
      distrito: mascota.distrito, tamaño: mascota.tamaño, descripcion: mascota.descripcion,
      foto: mascota.urlFoto,
    });
    this.urlFoto = mascota.urlFoto;
    this.vistaPrevia = this.mascotaService.urlFotoMascota(mascota.urlFoto);
    this.mascotaForm.markAsPristine();
    this.mascotaForm.markAsUntouched();
    this.error = '';
  }

  seguirEditando(): void {
    if (!this.comprobarSesion() || !this.mascotaPublicada) return;
    this.cargarFormulario(this.mascotaPublicada);
    this.mascotaPublicada = null;
  }

  campoInvalido(nombre: string): boolean {
    const campo = this.mascotaForm.get(nombre);
    return !!campo && campo.invalid && campo.touched;
  }

  seleccionarFoto(evento: Event): void {
    if (this.guardando || !this.comprobarSesion()) return;
    const entrada = evento.target as HTMLInputElement;
    const archivos = entrada.files;
    const foto = archivos?.item(0);
    const cantidadArchivos = archivos?.length || 0;
    entrada.value = '';
    if (!foto) return;
    this.quitarFoto();
    const revision = this.revisionFoto;
    if (cantidadArchivos !== 1 || !['image/png', 'image/jpeg', 'image/webp'].includes(foto.type)
      || foto.size === 0 || foto.size > 1024 * 1024) {
      this.errorFoto = 'Selecciona una sola imagen PNG, JPG o WebP de hasta 1 MB.';
      return;
    }
    this.leyendoFoto = true;
    const url = URL.createObjectURL(foto);
    const imagen = new Image();
    imagen.onload = () => {
      if (revision !== this.revisionFoto || !this.comprobarSesion()) {
        URL.revokeObjectURL(url);
        return;
      }
      this.archivo = foto;
      this.vistaPrevia = url;
      this.leyendoFoto = false;
      this.mascotaForm.patchValue({ foto: foto.name });
      this.cdr.markForCheck();
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      if (revision !== this.revisionFoto || !this.comprobarSesion()) return;
      this.leyendoFoto = false;
      this.errorFoto = 'El archivo no contiene una imagen válida. Selecciona otra fotografía.';
      this.cdr.markForCheck();
    };
    imagen.src = url;
  }

  quitarFoto(): void {
    if (this.guardando) return;
    this.revisionFoto++;
    if (this.vistaPrevia) URL.revokeObjectURL(this.vistaPrevia);
    this.vistaPrevia = '';
    this.archivo = null;
    this.urlFoto = '';
    this.errorFoto = '';
    this.leyendoFoto = false;
    this.mascotaForm.patchValue({ foto: '' });
  }

  publicar(): void {
    if (this.guardando || this.leyendoFoto || this.cargando || this.mascotaPublicada || !this.comprobarSesion()) return;
    this.mascotaForm.markAllAsTouched();
    if (this.mascotaForm.invalid || (!this.archivo && !this.urlFoto) || this.idEntidad === null) return;
    this.guardando = true;
    this.error = '';
    if (this.urlFoto) {
      this.guardarMascota();
      return;
    }
    this.reporteService.subirImagen(this.archivo!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        if (!this.comprobarSesion()) return;
        if (typeof respuesta?.url !== 'string' || !respuesta.url.trim() || respuesta.url.length > 255) {
          this.guardando = false;
          this.error = 'La subida no devolvió una URL válida. No se pudo registrar la mascota.';
          this.cdr.markForCheck();
          return;
        }
        this.urlFoto = respuesta.url.trim();
        this.guardarMascota();
      },
      error: (error: HttpErrorResponse) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        this.error = error.status === 413 ? 'La imagen supera el tamaño permitido por el servidor.'
          : 'No se pudo subir la fotografía. Intenta nuevamente.';
        this.tratarAutenticacion(error);
        this.cdr.markForCheck();
      },
    });
  }

  private guardarMascota(): void {
    if (!this.comprobarSesion() || this.idEntidad === null) return;
    const valores = this.mascotaForm.value;
    const cantidad = Number(valores.edad);
    let unidad = valores.unidadEdad;
    if (cantidad === 1) unidad = unidad === 'meses' ? 'mes' : 'año';
    const mascota = new Mascota();
    mascota.nombre = valores.nombre.trim();
    mascota.especie = valores.especie;
    mascota.edad = this.edadAnterior && (valores.edad === null || valores.edad === '')
      ? this.edadAnterior : cantidad + ' ' + unidad;
    mascota.sexo = valores.sexo;
    mascota.distrito = valores.distrito;
    mascota.tamaño = valores.tamaño;
    mascota.descripcion = valores.descripcion.trim();
    mascota.urlFoto = this.urlFoto;
    const idEntidad = this.idEntidad;
    (this.edicion ? this.mascotaService.editarMascota(this.idMascota, mascota)
      : this.mascotaService.publicarMascota(idEntidad, mascota)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        if (!respuesta || !Number.isSafeInteger(respuesta.idMascota) || respuesta.idMascota <= 0
          || respuesta.entidadIdEntidad !== idEntidad || (this.edicion ? respuesta.idMascota !== this.idMascota : respuesta.estado !== true)) {
          this.error = 'No se pudo confirmar el guardado. Comprueba Adopciones antes de reintentar.';
        } else {
          this.mascotaPublicada = respuesta;
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        if (error.status === 403) {
          this.error = 'Solo puedes guardar mascotas de tu propia entidad.';
        } else if (error.status === 404) {
          this.error = this.edicion ? 'La mascota ya no existe. Regresa a Adopciones.' : 'No se encontró la entidad asociada a tu cuenta.';
        } else if (error.status === 400) {
          this.error = 'Revisa los campos del formulario. El servidor rechazó los datos enviados.';
        } else {
          this.error = 'No se pudo confirmar el guardado. Comprueba Adopciones antes de reintentar. La fotografía se conserva.';
        }
        this.tratarAutenticacion(error);
        this.cdr.markForCheck();
      },
    });
  }

  publicarOtra(): void {
    if (!this.comprobarSesion()) return;
    this.mascotaPublicada = null;
    this.mascotaForm.reset({ nombre: '', especie: '', edad: null, unidadEdad: 'meses', sexo: '', distrito: '', tamaño: '', descripcion: '', foto: '' });
    this.quitarFoto();
    this.error = '';
  }

  cancelar(): void {
    if (!this.guardando) void this.router.navigateByUrl('/adopciones-entidad');
  }

  private comprobarSesion(): boolean {
    const roles = this.auth.roles();
    if (this.tokenSesion && this.auth.token() === this.tokenSesion && this.auth.correoEntidad()
      && Array.isArray(roles) && roles.includes('ROLE_ENTIDAD')
      && (this.idEntidad === null || this.auth.idEntidad() === this.idEntidad)) return true;
    this.guardando = false;
    this.cargando = false;
    this.publicacionCaducada();
    this.errorSesion = 'La sesión cambió o caducó. Vuelve a iniciar sesión para publicar.';
    this.cdr.markForCheck();
    return false;
  }

  private publicacionCaducada(): void {
    this.quitarFoto();
    this.mascotaForm.reset();
    this.mascotaPublicada = null;
    this.nombreEntidad = '';
  }

  private tratarAutenticacion(error: HttpErrorResponse | Error): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.cerrarSesion();
      void this.router.navigateByUrl('/login');
    }
  }

  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }

  ngOnDestroy(): void {
    this.revisionFoto++;
    if (this.vistaPrevia) URL.revokeObjectURL(this.vistaPrevia);
  }
}
