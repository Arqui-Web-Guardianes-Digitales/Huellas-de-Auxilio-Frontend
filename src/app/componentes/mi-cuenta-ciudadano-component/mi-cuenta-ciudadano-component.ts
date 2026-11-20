import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, TimeoutError, finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { CiudadanoService, PerfilCiudadano } from '../../services/ciudadano-service';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

type TarjetaId = 'personales' | 'correo' | 'password';
type Campo = 'nombreCompleto' | 'dni' | 'distrito' | 'correo' | 'telefono'
  | 'contrasenaActual' | 'nuevaContrasena' | 'confirmarContrasena';

interface CampoPerfil {
  clave: Campo;
  etiqueta: string;
  tipo: 'text' | 'email' | 'password' | 'tel';
  autocompletar: string;
}

interface TarjetaPerfil {
  id: TarjetaId;
  titulo: string;
  campos: CampoPerfil[];
}

@Component({
  selector: 'app-mi-cuenta-ciudadano-component',
  standalone: true,
  imports: [FormsModule, RouterLink, MatDialogModule],
  templateUrl: './mi-cuenta-ciudadano-component.html',
  styleUrl: './mi-cuenta-ciudadano-component.css',
})
export class MiCuentaCiudadanoComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly servicio = inject(CiudadanoService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private perfil: PerfilCiudadano | null = null;
  private tokenSesion: string | null = null;
  private readonly dialog = inject(MatDialog);
  private dialogoEliminarRef: MatDialogRef<unknown> | null = null;

  @ViewChild('dialogoEliminar')
  dialogoEliminar!: TemplateRef<unknown>;

  contrasenaEliminar = '';
  errorEliminar = '';
  eliminando = false;
  cuentaDesactivada = false;

  menuAbierto = false;
  mensaje = '';
  errorCarga = '';
  cargando = false;
  guardando = false;
  requiereLogin = false;
  correoActualizado = '';

  datos: Record<Campo, string> = {
    nombreCompleto: '', dni: '', distrito: '', correo: '', telefono: '',
    contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '',
  };
  borrador: Record<Campo, string> = { ...this.datos };
  editando: Record<TarjetaId, boolean> = { personales: false, correo: false, password: false };
  errores: Record<TarjetaId, string> = { personales: '', correo: '', password: '' };

  readonly tarjetas: TarjetaPerfil[] = [
    {
      id: 'personales', titulo: 'Datos personales', campos: [
        { clave: 'nombreCompleto', etiqueta: 'NOMBRE COMPLETO', tipo: 'text', autocompletar: 'name' },
        { clave: 'dni', etiqueta: 'DNI', tipo: 'text', autocompletar: 'off' },
        { clave: 'distrito', etiqueta: 'DISTRITO', tipo: 'text', autocompletar: 'address-level2' },
      ],
    },
    {
      id: 'correo', titulo: 'Datos de contacto', campos: [
        { clave: 'correo', etiqueta: 'CORREO', tipo: 'email', autocompletar: 'email' },
        { clave: 'telefono', etiqueta: 'TELÉFONO', tipo: 'tel', autocompletar: 'tel' },
      ],
    },
    {
      id: 'password', titulo: 'Contraseña', campos: [
        { clave: 'contrasenaActual', etiqueta: 'CONTRASEÑA ACTUAL', tipo: 'password', autocompletar: 'current-password' },
        { clave: 'nuevaContrasena', etiqueta: 'NUEVA CONTRASEÑA', tipo: 'password', autocompletar: 'new-password' },
        { clave: 'confirmarContrasena', etiqueta: 'CONFIRMAR CONTRASEÑA', tipo: 'password', autocompletar: 'new-password' },
      ],
    },
  ];

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !Array.isArray(roles) || !roles.includes('ROLE_CIUDADANO')) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    if (this.cargando || this.eliminando || !this.comprobarSesion()) return;
    this.cargando = true;
    this.errorCarga = '';
    this.servicio.obtenerPerfil().pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (perfil) => {
        if (!this.comprobarSesion()) return;
        this.perfil = perfil;
        this.datos = {
          nombreCompleto: perfil.nombreCompleto, dni: perfil.dni,
          distrito: perfil.distrito, correo: perfil.correo, telefono: perfil.telefono,
          contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '',
        };
        this.borrador = { ...this.datos };
        this.auth.guardarDatosCiudadano(perfil.idCiudadano, perfil.nombreCompleto);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        if (this.comprobarSesion()) this.errorCarga = this.obtenerMensajeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  get nombreVisible(): string { return this.datos.nombreCompleto || 'Ciudadano'; }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void { this.menuAbierto = false; }

  mostrarCampo(campo: Campo): string {
    const valor = this.datos[campo];
    if (!valor) return 'Sin información';
    return campo === 'dni'
      ? '*'.repeat(Math.max(0, valor.length - 2)) + valor.slice(-2) : valor;
  }

  alternarEdicion(id: TarjetaId): void {
    if (this.cargando || this.guardando || this.eliminando || !this.perfil || !this.comprobarSesion()) return;
    this.mensaje = '';
    this.errores[id] = '';
    if (!this.editando[id]) {
      if (Object.values(this.editando).some(Boolean)) {
        this.mensaje = 'Guarda o cancela la edición actual antes de editar otra sección.';
        return;
      }
      this.borrador = { ...this.datos };
      this.editando[id] = true;
      return;
    }

    if (id === 'personales') {
      const datos = {
        nombreCompleto: this.borrador.nombreCompleto.trim(),
        dni: this.borrador.dni.trim(), distrito: this.borrador.distrito.trim(),
      };
      if (!datos.nombreCompleto || !/^\d{8}$/.test(datos.dni) || !datos.distrito) {
        this.errores[id] = 'Completa nombre completo, DNI de 8 dígitos y distrito.';
        return;
      }
      const idCiudadano = this.perfil.idCiudadano;
      this.guardar(id, this.servicio.actualizarPersonales(idCiudadano, datos), () => {
        Object.assign(this.datos, datos);
        Object.assign(this.perfil!, datos);
        this.auth.guardarDatosCiudadano(idCiudadano, datos.nombreCompleto);
        this.mensaje = 'Datos personales actualizados correctamente.';
      });
    } else if (id === 'correo') {
      const datos = {
        correo: this.borrador.correo.trim().toLowerCase(),
        telefono: this.borrador.telefono.trim(),
      };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo) || !/^\d{9}$/.test(datos.telefono)) {
        this.errores[id] = 'Ingresa un correo válido y un teléfono de 9 dígitos.';
        return;
      }
      const cambiaCorreo = datos.correo !== this.perfil.correo.trim().toLowerCase();
      this.guardar(id, this.servicio.actualizarContacto(this.perfil.idUsuario, datos), () => {
        Object.assign(this.datos, datos);
        Object.assign(this.perfil!, datos);
        this.mensaje = 'Datos de contacto actualizados correctamente.';
        if (cambiaCorreo) {
          this.auth.cerrarSesion();
          this.requiereLogin = true;
          this.correoActualizado = datos.correo;
          this.mensaje = 'Contacto actualizado. Inicia sesión nuevamente con tu nuevo correo.';
        }
      });
    } else {
      const datos = {
        contrasenaActual: this.borrador.contrasenaActual,
        nuevaContrasena: this.borrador.nuevaContrasena,
        confirmarContrasena: this.borrador.confirmarContrasena,
      };
      if (!datos.contrasenaActual.trim() || !datos.nuevaContrasena.trim()
        || datos.nuevaContrasena.length < 8
        || new TextEncoder().encode(datos.nuevaContrasena).length > 72
        || datos.nuevaContrasena !== datos.confirmarContrasena) {
        this.errores[id] = 'Ingresa la contraseña actual y confirma una nueva de al menos 8 caracteres y hasta 72 bytes.';
        return;
      }
      this.guardar(id, this.servicio.cambiarContrasena(this.perfil.correo, datos), () => {
        this.mensaje = 'Contraseña actualizada correctamente.';
      });
    }
  }

  private guardar(id: TarjetaId, operacion: Observable<void>, confirmar: () => void): void {
    this.guardando = true;
    operacion.pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.guardando = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => {
        if (!this.comprobarSesion()) return;
        confirmar();
        this.editando[id] = false;
        this.limpiarContrasenas();
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        if (this.comprobarSesion()) this.errores[id] = this.obtenerMensajeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  cancelarEdicion(id: TarjetaId): void {
    if (this.guardando || this.eliminando) return;
    this.borrador = { ...this.datos };
    this.limpiarContrasenas();
    this.editando[id] = false;
    this.errores[id] = '';
    this.mensaje = '';
  }

  private comprobarSesion(): boolean {
    if (!this.requiereLogin && this.tokenSesion && this.auth.token() === this.tokenSesion) return true;
    this.requiereLogin = true;
    this.limpiarContrasenas();
    this.contrasenaEliminar = '';
    this.dialogoEliminarRef?.close();
    if (!this.mensaje) this.mensaje = 'La sesión cambió. Inicia sesión nuevamente.';
    return false;
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servidor tardó demasiado en responder. Tus cambios no se han confirmado. Puedes volver a intentarlo.';
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
      if (error.status === 401 || error.status === 403) {
        this.auth.cerrarSesion();
        this.requiereLogin = true;
        this.limpiarContrasenas();
        this.mensaje = 'La sesión no es válida. Inicia sesión nuevamente.';
        return this.mensaje;
      }
      if (error.status === 409) return 'El DNI o correo ya está registrado en otra cuenta. Revisa los datos.';
      if (error.status === 400 || error.status === 422) return 'Revisa el formato de los datos ingresados.';
      if (error.status === 404) return 'No se encontró el perfil solicitado. Recarga la página para consultar tus datos.';
      if (error.status >= 500) return 'El servidor no pudo confirmar el cambio. Conservamos tu borrador para que puedas intentarlo nuevamente.';
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  }

  private limpiarContrasenas(): void {
    this.borrador.contrasenaActual = '';
    this.borrador.nuevaContrasena = '';
    this.borrador.confirmarContrasena = '';
  }

  cerrarSesion(): void {
    this.limpiarContrasenas();
    this.contrasenaEliminar = '';
    this.dialogoEliminarRef?.close();
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  informarEliminacion(): void {
    if (this.cargando || this.guardando || this.eliminando || this.dialogoEliminarRef
      || !this.perfil || !this.comprobarSesion()) return;

    this.contrasenaEliminar = '';
    this.errorEliminar = '';
    this.dialogoEliminarRef = this.dialog.open(this.dialogoEliminar, {
      width: '440px',
      maxWidth: '95vw',
      disableClose: true,
      ariaLabelledBy: 'titulo-eliminar-cuenta',
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
    if (this.eliminando || !this.dialogoEliminarRef || !this.perfil || !this.comprobarSesion()) return;
    if (!this.contrasenaEliminar.trim()) {
      this.errorEliminar = 'Ingresa tu contraseña actual.';
      return;
    }

    const idUsuario = this.perfil.idUsuario;
    this.eliminando = true;
    this.errorEliminar = '';

    this.servicio.desactivarCuenta(idUsuario, this.perfil.correo, this.contrasenaEliminar).pipe(
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

        this.limpiarContrasenas();
        this.dialogoEliminarRef?.close();
        this.auth.cerrarSesion();
        this.cuentaDesactivada = true;
        this.requiereLogin = true;
        this.mensaje = 'Tu cuenta fue desactivada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.contrasenaEliminar = '';
        if (this.comprobarSesion()) {
          this.errorEliminar = error instanceof TimeoutError
            ? 'El servidor tardó demasiado. No se confirmó la desactivación de la cuenta.'
            : this.obtenerMensajeError(error);
          if (this.requiereLogin) this.dialogoEliminarRef?.close();
        }
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.contrasenaEliminar = '';
    this.dialogoEliminarRef?.close();
  }
}
