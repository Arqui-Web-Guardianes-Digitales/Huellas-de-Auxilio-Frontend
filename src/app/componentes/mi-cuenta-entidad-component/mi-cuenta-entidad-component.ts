import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Entidad } from '../../model/entidad';
import { Usuario } from '../../model/usuario';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-mi-cuenta-entidad-component',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './mi-cuenta-entidad-component.html',
  styleUrl: './mi-cuenta-entidad-component.css',
})
export class MiCuentaEntidadComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Datos ficticios para la adaptación visual. No proceden de la API.
  entidad = Object.assign(new Entidad(), {
    nombreEntidad: 'Refugio Patitas',
    tipoEntidad: 'Refugio',
    zonaAtencion: 'Lima Metropolitana',
  });
  usuario = Object.assign(new Usuario(), {
    correo: 'entidad@example.com',
    telefono: '987 654 321',
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

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  comenzarEdicion(seccion: 'entidad' | 'contacto' | 'seguridad'): void {
    this.borradorEntidad = Object.assign(new Entidad(), this.entidad);
    this.borradorUsuario = Object.assign(new Usuario(), this.usuario);
    this.limpiarClaves();
    this.editando = seccion;
    this.error = '';
    this.mensaje = '';
  }

  cancelarEdicion(): void {
    this.borradorEntidad = Object.assign(new Entidad(), this.entidad);
    this.borradorUsuario = Object.assign(new Usuario(), this.usuario);
    this.limpiarClaves();
    this.editando = null;
    this.error = '';
  }

  guardarEntidad(): void {
    if (this.editando !== 'entidad') return;
    const nombre = this.borradorEntidad.nombreEntidad.trim();
    const tipo = this.borradorEntidad.tipoEntidad.trim();
    const zona = this.borradorEntidad.zonaAtencion.trim();
    if (!nombre || !tipo || !zona || [nombre, tipo, zona].some((valor) => valor.length > 255)) {
      this.error = 'Completa el nombre, tipo de entidad y zona de atención.';
      return;
    }
    this.entidad = Object.assign(new Entidad(), this.entidad, {
      nombreEntidad: nombre,
      tipoEntidad: tipo,
      zonaAtencion: zona,
    });
    this.finalizarEdicionLocal();
  }

  guardarContacto(): void {
    if (this.editando !== 'contacto') return;
    const correo = this.borradorUsuario.correo.trim().toLowerCase();
    const telefono = this.borradorUsuario.telefono.trim();
    if (
      correo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      !/^\+?[0-9 -]{7,15}$/.test(telefono)
    ) {
      this.error = 'Ingresa un correo y un teléfono válidos.';
      return;
    }
    this.usuario = Object.assign(new Usuario(), this.usuario, { correo, telefono });
    this.finalizarEdicionLocal();
  }

  validarContrasena(): void {
    if (this.editando !== 'seguridad') return;
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
    // Solo demostración: el servidor debe comprobar la clave actual y guardar la nueva.
    this.limpiarClaves();
    this.editando = null;
    this.error = '';
    this.mensaje =
      'Formato y confirmación válidos. La contraseña no se cambió; falta conectar el endpoint del backend.';
  }

  mostrarPendiente(seccion: string): void {
    this.error = '';
    this.mensaje = `${seccion}: funcionalidad pendiente de integrar en esta adaptación.`;
    this.menuAbierto = false;
  }

  cerrarSesion(): void {
    this.limpiarClaves();
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  private finalizarEdicionLocal(): void {
    this.editando = null;
    this.error = '';
    this.mensaje =
      'Cambios aplicados solo en esta vista. Se perderán al recargar; no se guardaron en el servidor.';
  }

  private limpiarClaves(): void {
    this.contrasenaActual = '';
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
  }
}

