import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { Mascota } from '../../model/mascota';
import { Ciudadano } from '../../model/ciudadano';
import { Solicitud } from '../../model/solicitud';

import { MascotaService } from '../../services/mascota-service';
import { SolicitudService } from '../../services/solicitud-service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-solicitud-adopcion-component',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './solicitud-adopcion-component.html',
  styleUrl: './solicitud-adopcion-component.css',
})
export class SolicitudAdopcionComponent implements OnInit, OnDestroy {
  menuMobileAbierto = false;
  get nombreUsuario(): string { return this.auth.nombreCiudadano(); }
  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }
  private readonly mascotaService = inject(MascotaService);
  private readonly solicitudService = inject(SolicitudService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  solicitudForm = this.fb.nonNullable.group({
    tipoVivienda: [
      '',
      [Validators.required, Validators.pattern(/^(casa|departamento|habitacion)$/)],
    ],
    motivo: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    experiencia: this.fb.control<boolean | null>(null, Validators.required),
    aceptoTerminos: [false, Validators.requiredTrue],
  });

  intentoEnvio = false;

  mascota: Mascota | null = null;
  ciudadano: Ciudadano | null = null;

  correo = '';
  telefono = '';

  solicitud = new Solicitud();
  solicitudEnviada: Solicitud | null = null;

  cargando = true;
  enviando = false;
  error = '';

  ngOnInit(): void {
    console.log('[SolicitudAdopcionComponent] Entrada al componente.');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.warn(
        '[SolicitudAdopcionComponent] Acceso no autorizado; se solicita volver al login.',
      );
      void this.router.navigateByUrl('/login');
      return;
    }

    const idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));

    const correoSesion = this.auth.correo();

    if (!Number.isSafeInteger(idMascota) || idMascota <= 0) {
      console.warn(
        '[SolicitudAdopcionComponent] Validación fallida: identificador de mascota no válido.',
      );
      this.error = 'El identificador de la mascota no es válido.';
      this.cargando = false;
      return;
    }

    if (!correoSesion) {
      console.warn('[SolicitudAdopcionComponent] No se pudo identificar la cuenta de la sesión.');
      this.error = 'No se pudo identificar tu cuenta. Vuelve a iniciar sesión.';

      this.cargando = false;
      return;
    }

    console.log('[SolicitudAdopcionComponent] Carga del formulario y la mascota iniciada.', {
      idMascota,
    });
    forkJoin({
      mascota: this.mascotaService.buscarPorId(idMascota),
      ciudadano: this.auth.obtenerPerfilCiudadanoDB(),
      usuario: this.solicitudService.obtenerUsuarioPorCorreo(correoSesion),
    }).subscribe({
      next: (datos) => {
        this.cargando = false;

        if (!datos.mascota) {
          console.warn('[SolicitudAdopcionComponent] La API no devolvió la mascota seleccionada.');
          this.error = 'No se encontró la mascota.';
          this.cdr.markForCheck();
          return;
        }

        if (!datos.mascota.estado) {
          console.warn('[SolicitudAdopcionComponent] Solicitud bloqueada: mascota no disponible.');
          this.error = 'La mascota ya no está disponible.';
          this.cdr.markForCheck();
          return;
        }

        if (
          !datos.ciudadano?.idCiudadano ||
          !datos.usuario?.idUsuario ||
          datos.ciudadano.idUsuario !== datos.usuario.idUsuario
        ) {
          console.warn('[SolicitudAdopcionComponent] No se pudo confirmar el perfil de la cuenta.');
          this.error = 'No se pudo confirmar el perfil de tu cuenta.';

          this.cdr.markForCheck();
          return;
        }

        console.log('[SolicitudAdopcionComponent] Datos cargados; formulario disponible.', {
          idMascota,
        });
        this.mascota = datos.mascota;
        this.ciudadano = datos.ciudadano;

        this.correo = datos.usuario.correo;
        this.telefono = datos.usuario.telefono;

        this.solicitud.mascotaIdMascota = datos.mascota.idMascota;

        this.auth.guardarDatosCiudadano(
          datos.ciudadano.idCiudadano,
          datos.ciudadano.nombreCompleto || 'Ciudadano',
        );

        this.cdr.markForCheck();
      },

      error: (e: HttpErrorResponse) => {
        console.error('[SolicitudAdopcionComponent] Error al cargar los datos del formulario.', {
          estadoHttp: e.status,
        });
        this.cargando = false;

        this.error =
          e.status === 0
            ? 'No se pudo conectar con el backend.'
            : 'No se pudieron cargar los datos de la solicitud.';

        this.cdr.markForCheck();
      },
    });
  }

  enviarSolicitud(): void {
    console.log('[SolicitudAdopcionComponent] Intento de envío de solicitud.');
    if (this.enviando || this.solicitudEnviada) {
      console.warn(
        '[SolicitudAdopcionComponent] Envío omitido: hay un envío en curso o la solicitud ya fue registrada.',
      );
      return;
    }

    this.error = '';

    if (!this.ciudadano?.idCiudadano || !this.mascota) {
      console.warn(
        '[SolicitudAdopcionComponent] Validación fallida: faltan los datos del formulario.',
      );
      this.error = 'Primero deben cargarse tus datos y la mascota.';
      return;
    }

    this.intentoEnvio = true;
    this.solicitudForm.markAllAsTouched();
    const valores = this.solicitudForm.getRawValue();

    if (this.solicitudForm.invalid || valores.experiencia === null) {
      const camposInvalidos = Object.entries(this.solicitudForm.controls)
        .filter(([, control]) => control.invalid)
        .map(([campo]) => campo);

      console.warn(
        '[SolicitudAdopcionComponent] Validación fallida: revisa los campos del formulario.',
        {
          camposInvalidos,
        },
      );
      this.error = 'Revisa los campos indicados antes de enviar la solicitud.';
      return;
    }

    this.solicitud.tipoVivienda = valores.tipoVivienda;
    this.solicitud.motivo = valores.motivo.trim();
    this.solicitud.experiencia = valores.experiencia;
    this.solicitud.aceptoTerminos = valores.aceptoTerminos;

    console.log('[SolicitudAdopcionComponent] Validaciones superadas; enviando a la API.', {
      idMascota: this.solicitud.mascotaIdMascota,
    });
    this.enviando = true;
    this.solicitudForm.disable({ emitEvent: false });

    this.solicitudService.insertar(this.ciudadano.idCiudadano, this.solicitud).subscribe({
      next: (respuesta) => {
        this.enviando = false;
        this.solicitudForm.enable({ emitEvent: false });

        if (!respuesta?.idSolicitud) {
          console.warn(
            '[SolicitudAdopcionComponent] La API no confirmó el registro de la solicitud.',
          );
          this.error =
            'La solicitud no fue registrada. Revisa los datos ' +
            'y la disponibilidad de la mascota.';

          this.cdr.markForCheck();
          return;
        }

        this.solicitudEnviada = respuesta;
        console.log('[SolicitudAdopcionComponent] Solicitud registrada.', {
          idSolicitud: respuesta.idSolicitud,
          estado: respuesta.estadoSolicitud,
        });
        console.log('[SolicitudAdopcionComponent] Confirmación de solicitud mostrada.');
        this.cdr.markForCheck();
      },

      error: (e: HttpErrorResponse) => {
        console.error('[SolicitudAdopcionComponent] Error al enviar la solicitud.', {
          estadoHttp: e.status,
        });
        this.enviando = false;
        this.solicitudForm.enable({ emitEvent: false });

        this.error =
          e.status === 0
            ? 'Se perdió la conexión. Antes de reenviar, comprueba ' +
              'en Mis solicitudes si se registró.'
            : e.status === 400
              ? 'El backend rechazó los datos. Revisa los campos y acepta los términos de adopción.'
              : 'No se pudo completar el envío de la solicitud.';

        this.cdr.markForCheck();
      },
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.solicitudForm.get(campo);
    return !!control && control.invalid && (control.touched || control.dirty || this.intentoEnvio);
  }

  registrarCambioCampo(campo: string): void {
    const control = this.solicitudForm.get(campo);
    console.log('[SolicitudAdopcionComponent] Campo del formulario modificado.', {
      campo,
      valido: control?.valid,
      errores: Object.keys(control?.errors ?? {}),
    });
  }

  registrarErrorImagen(): void {
    console.warn('[SolicitudAdopcionComponent] No se pudo cargar la foto de la mascota.');
  }

  registrarNavegacion(destino: string | (string | number)[]): void {
    console.log('[SolicitudAdopcionComponent] Navegación solicitada.', { destino });
  }

  ngOnDestroy(): void {
    console.log('[SolicitudAdopcionComponent] Salida del componente.');
  }
}
