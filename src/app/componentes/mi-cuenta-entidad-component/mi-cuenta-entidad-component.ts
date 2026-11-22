import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Entidad } from '../../model/entidad';
import { Usuario } from '../../model/usuario';
import { AuthService } from '../../services/auth-service';
import { EntidadService } from '../../services/entidad-service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-mi-cuenta-entidad-component',
  standalone: true,
  imports: [FormsModule, RouterLink, MatDialogModule],
  templateUrl: './mi-cuenta-entidad-component.html',
  styleUrl: './mi-cuenta-entidad-component.css',
})
export class MiCuentaEntidadComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly entidadService = inject(EntidadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private tokenSesion: string | null = null;
  private readonly dialog = inject(MatDialog);
  private dialogoEliminarRef: MatDialogRef<unknown> | null = null;

  @ViewChild('dialogoEliminarEntidad')
  dialogoEliminarEntidad!: TemplateRef<unknown>;

  contrasenaEliminar = '';
  errorEliminar = '';
  eliminando = false;
  cuentaDesactivada = false;

  cargando = false;
  guardando = false;
  errorCarga = '';
  requiereLogin = false;
  correoActualizado = '';

  entidad = Object.assign(new Entidad(), {
    nombreEntidad: '',
    tipoEntidad: '',
    zonaAtencion: '',
  });
  usuario = Object.assign(new Usuario(), {
    correo: '',
    telefono: '',
  });
  borradorEntidad = Object.assign(new Entidad(), this.entidad);
  borradorUsuario = Object.assign(new Usuario(), this.usuario);
  editando: 'entidad' | 'contacto' | 'seguridad' | null = null;
  menuAbierto = false;
  mensaje = '';
  error = '';
  contrasenaActual = '';
  nuevaContrasena = '';
  confirmarContrasena = '';

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !Array.isArray(roles) || !roles.includes('ROLE_ENTIDAD')) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    if (this.cargando || this.guardando || this.eliminando || !this.comprobarSesion()) return;
    this.cargando = true;
    this.errorCarga = '';
    this.entidadService.obtenerCuenta().pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (cuenta) => {
        if (!this.comprobarSesion()) return;
        const entidad = cuenta.entidad;
        if (!entidad || !Number.isSafeInteger(entidad.idEntidad) || entidad.idEntidad! <= 0
          || !Number.isSafeInteger(entidad.idUsuario) || entidad.idUsuario <= 0) {
          this.errorCarga = 'No se encontró el perfil de tu entidad.';
          this.cdr.markForCheck();
          return;
        }
        this.entidad = Object.assign(new Entidad(), entidad);
        this.borradorEntidad = Object.assign(new Entidad(), entidad);
        this.usuario = Object.assign(new Usuario(), cuenta.usuario);
        this.borradorUsuario = Object.assign(new Usuario(), this.usuario);
        this.auth.guardarDatosEntidad(entidad.idEntidad!, entidad.nombreEntidad);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        if (this.comprobarSesion()) this.errorCarga = this.obtenerMensajeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  comenzarEdicion(seccion: 'entidad' | 'contacto' | 'seguridad'): void {
    if (this.cargando || this.guardando || this.eliminando) {
      this.error = 'Espera a que termine la operación actual para editar tu cuenta.';
      this.cdr.markForCheck();
      return;
    }
    if (this.errorCarga || !Number.isSafeInteger(this.entidad.idEntidad) || this.entidad.idEntidad! <= 0) {
      this.error = 'No se ha cargado correctamente tu entidad. Vuelve a cargar el perfil.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.comprobarSesion()) return;
    if (this.editando !== null && this.editando !== seccion) {
      this.error = 'Guarda o cancela la edición actual antes de editar otra sección.';
      this.cdr.markForCheck();
      return;
    }

    this.borradorEntidad = Object.assign(new Entidad(), this.entidad, {
      sitioWeb: this.entidad.sitioWeb || '',
      fechaAtencionInicio: this.entidad.fechaAtencionInicio || '',
      fechaAtencionFinal: this.entidad.fechaAtencionFinal || '',
      diasAtencion: this.entidad.diasAtencion || '',
    });
    this.borradorUsuario = Object.assign(new Usuario(), this.usuario);
    this.limpiarClaves();
    this.editando = seccion;
    this.error = '';
    this.mensaje = '';
    this.cdr.detectChanges();
  }

  cancelarEdicion(): void {
    if (this.cargando || this.guardando || this.eliminando || !this.comprobarSesion()) return;
    this.borradorEntidad = Object.assign(new Entidad(), this.entidad);
    this.borradorUsuario = Object.assign(new Usuario(), this.usuario);
    this.limpiarClaves();
    this.editando = null;
    this.error = '';
    this.cdr.detectChanges();
  }

  guardarEntidad(): void {
    if (this.editando !== 'entidad' || this.guardando || this.cargando || this.eliminando
      || !this.entidad.idEntidad || !this.comprobarSesion()) return;
    const nombre = this.borradorEntidad.nombreEntidad.trim();
    const tipo = this.borradorEntidad.tipoEntidad.trim();
    const zona = this.borradorEntidad.zonaAtencion.trim();
    if (!nombre || !tipo || !zona || [nombre, tipo, zona].some((valor) => valor.length > 255)) {
      this.error = 'Completa el nombre, tipo de entidad y zona de atención.';
      return;
    }
    const sitioWeb = (this.borradorEntidad.sitioWeb || '').trim();
    const diasAtencion = (this.borradorEntidad.diasAtencion || '').trim();

    if (sitioWeb.length > 255 || diasAtencion.length > 255) {
      this.error = 'El sitio web y los días de atención admiten hasta 255 caracteres.';
      return;
    }

    if (sitioWeb) {
      try {
        const direccionWeb = new URL(sitioWeb);
        if (direccionWeb.protocol !== 'http:' && direccionWeb.protocol !== 'https:') {
          this.error = 'El sitio web debe comenzar con http:// o https://.';
          return;
        }
      } catch {
        this.error = 'Ingresa un sitio web válido, por ejemplo https://www.ejemplo.com.';
        return;
      }
    }

    const datos = Object.assign(new Entidad(), {
      nombreEntidad: nombre,
      tipoEntidad: tipo,
      zonaAtencion: zona,
      sitioWeb,
      fechaAtencionInicio: this.borradorEntidad.fechaAtencionInicio || undefined,
      fechaAtencionFinal: this.borradorEntidad.fechaAtencionFinal || undefined,
      diasAtencion,
    });
    const idEntidad = this.entidad.idEntidad;
    const idUsuario = this.entidad.idUsuario;
    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.entidadService.actualizarEntidad(idEntidad, datos).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.guardando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (actualizada) => {
        if (!this.comprobarSesion()) return;
        if (!actualizada || actualizada.idEntidad !== idEntidad || actualizada.idUsuario !== idUsuario) {
          this.error = 'El servidor no confirmó la actualización de tu entidad.';
          this.cdr.markForCheck();
          return;
        }
        this.entidad = Object.assign(new Entidad(), actualizada);
        this.borradorEntidad = Object.assign(new Entidad(), actualizada);
        this.auth.guardarDatosEntidad(idEntidad, actualizada.nombreEntidad);
        this.editando = null;
        this.mensaje = 'Datos de la entidad actualizados correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        if (this.comprobarSesion()) this.error = this.obtenerMensajeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  guardarContacto(): void {
    if (this.editando !== 'contacto' || this.cargando || this.guardando || this.eliminando
      || !this.usuario.idUsuario || !this.comprobarSesion()) return;
    const correo = this.borradorUsuario.correo.trim().toLowerCase();
    const telefono = this.borradorUsuario.telefono.trim();
    if (
      correo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      !/^\d{9}$/.test(telefono)
    ) {
      this.error = 'Ingresa un correo válido y un teléfono de 9 dígitos.';
      return;
    }
    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.entidadService.actualizarContacto(this.usuario.idUsuario, correo, telefono).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.guardando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (resultado) => {
        if (!this.comprobarSesion()) return;
        this.usuario.correo = resultado.correo;
        this.usuario.telefono = resultado.telefono;
        this.borradorUsuario = Object.assign(new Usuario(), this.usuario);
        this.editando = null;
        this.mensaje = 'Datos de contacto actualizados correctamente.';
        if (resultado.correoModificado) {
          this.auth.cerrarSesion();
          this.limpiarClaves();
          this.requiereLogin = true;
          this.correoActualizado = resultado.correo;
          this.mensaje = 'Contacto actualizado. Inicia sesión nuevamente con tu nuevo correo.';
        }
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        if (this.comprobarSesion()) this.error = this.obtenerMensajeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  validarContrasena(): void {
    if (this.editando !== 'seguridad' || this.cargando || this.guardando || this.eliminando
      || !this.comprobarSesion()) return;
    if (
      !this.contrasenaActual.trim() ||
      !this.nuevaContrasena.trim() ||
      this.nuevaContrasena.length < 8 ||
      new TextEncoder().encode(this.nuevaContrasena).length > 72 ||
      this.nuevaContrasena !== this.confirmarContrasena
    ) {
      this.error =
        'Completa la clave actual y confirma una nueva de al menos 8 caracteres y hasta 72 bytes UTF-8.';
      return;
    }
    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.entidadService.cambiarContrasena(
      this.usuario.correo, this.contrasenaActual, this.nuevaContrasena, this.confirmarContrasena,
    ).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.guardando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => {
        if (!this.comprobarSesion()) return;
        this.limpiarClaves();
        this.editando = null;
        this.mensaje = 'Contraseña actualizada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        if (this.comprobarSesion()) this.error = this.obtenerMensajeError(error);
        this.limpiarClaves();
        this.cdr.markForCheck();
      },
    });
  }

  mostrarPendiente(seccion: string): void {
    this.error = '';
    this.mensaje = `${seccion}: funcionalidad pendiente de integrar en esta adaptación.`;
    this.menuAbierto = false;
  }

  cerrarSesion(): void {
    this.limpiarClaves();
    this.contrasenaEliminar = '';
    this.dialogoEliminarRef?.close();
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  private comprobarSesion(): boolean {
    if (this.requiereLogin) return false;
    if (this.tokenSesion && this.auth.token() === this.tokenSesion) return true;
    this.limpiarClaves();
    this.contrasenaEliminar = '';
    this.dialogoEliminarRef?.close();
    void this.router.navigateByUrl('/login');
    return false;
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof TimeoutError) return 'El servidor tardó demasiado. No se confirmó la operación.';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
      if (error.status === 401) {
        this.auth.cerrarSesion();
        void this.router.navigateByUrl('/login');
        return 'La sesión no es válida. Inicia sesión nuevamente.';
      }
      if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  }

  informarEliminacion(): void {
    if (this.cargando || this.guardando || this.eliminando || this.dialogoEliminarRef
      || this.errorCarga || !this.usuario.idUsuario || !this.comprobarSesion()) return;
    this.contrasenaEliminar = '';
    this.errorEliminar = '';
    this.dialogoEliminarRef = this.dialog.open(this.dialogoEliminarEntidad, {
      width: '440px', maxWidth: '95vw', disableClose: true,
      ariaLabelledBy: 'titulo-eliminar-entidad',
    });
    this.dialogoEliminarRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.dialogoEliminarRef = null;
      this.contrasenaEliminar = '';
    });
  }

  cancelarEliminacion(): void {
    if (this.eliminando) return;
    this.contrasenaEliminar = '';
    this.errorEliminar = '';
    this.dialogoEliminarRef?.close();
  }

  confirmarEliminacion(): void {
    if (this.eliminando || !this.dialogoEliminarRef || !this.usuario.idUsuario
      || !this.comprobarSesion()) return;
    if (!this.contrasenaEliminar.trim()) {
      this.errorEliminar = 'Ingresa tu contraseña actual.';
      return;
    }
    const idUsuario = this.usuario.idUsuario;
    this.eliminando = true;
    this.errorEliminar = '';
    this.entidadService.desactivarCuenta(idUsuario, this.usuario.correo, this.contrasenaEliminar).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.eliminando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (usuario) => {
        if (!this.comprobarSesion()) return;
        this.contrasenaEliminar = '';
        if (!usuario || usuario.idUsuario !== idUsuario || usuario.estadoUsuario !== false) {
          this.errorEliminar = 'No se pudo desactivar la cuenta. Verifica tu contraseña.';
          this.cdr.markForCheck();
          return;
        }
        this.limpiarClaves();
        this.dialogoEliminarRef?.close();
        this.auth.cerrarSesion();
        this.cuentaDesactivada = true;
        this.requiereLogin = true;
        this.mensaje = 'La cuenta de tu entidad fue desactivada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.contrasenaEliminar = '';
        if (this.comprobarSesion()) {
          this.errorEliminar = error instanceof TimeoutError
            ? 'El servidor tardó demasiado. No se confirmó la desactivación de la cuenta.'
            : this.obtenerMensajeError(error);
          if (!this.auth.token()) this.dialogoEliminarRef?.close();
        }
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.contrasenaEliminar = '';
    this.dialogoEliminarRef?.close();
  }

  private limpiarClaves(): void {
    this.contrasenaActual = '';
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
  }
}

