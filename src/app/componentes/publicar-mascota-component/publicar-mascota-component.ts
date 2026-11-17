import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
    if (this.mascotaForm.invalid || !this.archivo || this.idEntidad === null) return;
    this.guardando = true;
    this.error = '';
    if (this.urlFoto) {
      this.guardarMascota();
      return;
    }
    this.reporteService.subirImagen(this.archivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    mascota.edad = cantidad + ' ' + unidad;
    mascota.sexo = valores.sexo;
    mascota.distrito = valores.distrito;
    mascota.tamaño = valores.tamaño;
    mascota.descripcion = valores.descripcion.trim();
    mascota.urlFoto = this.urlFoto;
    const idEntidad = this.idEntidad;
    this.mascotaService.publicarMascota(idEntidad, mascota).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        if (!respuesta || !Number.isSafeInteger(respuesta.idMascota) || respuesta.idMascota <= 0
          || respuesta.entidadIdEntidad !== idEntidad || respuesta.estado !== true) {
          this.error = 'No se pudo confirmar el registro. Comprueba Adopciones antes de reintentar.';
        } else {
          this.mascotaPublicada = respuesta;
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        if (!this.comprobarSesion()) return;
        this.guardando = false;
        if (error.status === 403) {
          this.error = 'Solo puedes publicar mascotas para tu propia entidad.';
        } else if (error.status === 404) {
          this.error = 'No se encontró la entidad asociada a tu cuenta.';
        } else if (error.status === 400) {
          this.error = 'Revisa los campos del formulario. El servidor rechazó los datos enviados.';
        } else {
          this.error = 'No se pudo confirmar la publicación. Comprueba Adopciones antes de reintentar. La fotografía subida se conserva.';
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
