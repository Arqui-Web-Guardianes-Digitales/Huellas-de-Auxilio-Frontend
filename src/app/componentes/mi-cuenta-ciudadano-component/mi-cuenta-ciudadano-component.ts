import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

type TarjetaId = 'personales' | 'correo' | 'password';
type Campo = 'nombre' | 'apellido' | 'dni' | 'correo' | 'password';
interface CampoPerfil {
  clave: Campo;
  etiqueta: string;
  tipo: 'text' | 'email' | 'password';
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
  imports: [FormsModule, RouterLink],
  templateUrl: './mi-cuenta-ciudadano-component.html',
  styleUrl: './mi-cuenta-ciudadano-component.css',
})
export class MiCuentaCiudadanoComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  menuAbierto = false;
  mensaje = '';
  // Datos ficticios del prototipo. No son un perfil recuperado de la API.
  datos: Record<Campo, string> = {
    nombre: 'Jefferson',
    apellido: 'Flores',
    dni: '12345678',
    correo: 'jefferson.flores@example.com',
    password: '',
  };
  borrador: Record<Campo, string> = { ...this.datos };
  editando: Record<TarjetaId, boolean> = { personales: false, correo: false, password: false };
  errores: Record<TarjetaId, string> = { personales: '', correo: '', password: '' };
  readonly tarjetas: TarjetaPerfil[] = [
    {
      id: 'personales',
      titulo: 'Datos personales',
      campos: [
        { clave: 'nombre', etiqueta: 'NOMBRE', tipo: 'text', autocompletar: 'given-name' },
        { clave: 'apellido', etiqueta: 'APELLIDO', tipo: 'text', autocompletar: 'family-name' },
        { clave: 'dni', etiqueta: 'DNI', tipo: 'text', autocompletar: 'off' },
      ],
    },
    {
      id: 'correo',
      titulo: 'Correo electrónico',
      campos: [{ clave: 'correo', etiqueta: 'CORREO', tipo: 'email', autocompletar: 'email' }],
    },
    {
      id: 'password',
      titulo: 'Contraseña',
      campos: [
        {
          clave: 'password',
          etiqueta: 'CONTRASEÑA',
          tipo: 'password',
          autocompletar: 'new-password',
        },
      ],
    },
  ];

  get nombreVisible(): string {
    return `${this.datos.nombre} ${this.datos.apellido}`.trim() || 'Ciudadano';
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  mostrarCampo(campo: Campo): string {
    const valor = this.datos[campo];
    if (campo === 'password') return '************';
    if (!valor) return 'Sin información';
    if (campo === 'dni') return '*'.repeat(Math.max(0, valor.length - 2)) + valor.slice(-2);
    if (campo === 'nombre' || campo === 'apellido') {
      return valor.charAt(0) + '*'.repeat(Math.max(0, valor.length - 1));
    }
    return valor;
  }

  alternarEdicion(id: TarjetaId): void {
    this.mensaje = '';
    this.errores[id] = '';
    const tarjeta = this.tarjetas.find((item) => item.id === id)!;
    if (!this.editando[id]) {
      for (const campo of tarjeta.campos) this.borrador[campo.clave] = this.datos[campo.clave];
      this.editando[id] = true;
      return;
    }
    if (
      id === 'personales' &&
      (!this.borrador.nombre.trim() ||
        !this.borrador.apellido.trim() ||
        !/^\d{8}$/.test(this.borrador.dni.trim()))
    ) {
      this.errores[id] = 'Completa nombre, apellido y un DNI de 8 dígitos.';
      return;
    }
    if (id === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.borrador.correo.trim())) {
      this.errores[id] = 'Ingresa un correo electrónico válido.';
      return;
    }
    if (id === 'password') {
      if (this.borrador.password.length < 8) {
        this.errores[id] = 'Escribe al menos 8 caracteres.';
        return;
      }
      // No conservar una contraseña en el prototipo ni afirmar un cambio real.
      this.borrador.password = '';
      this.editando[id] = false;
      this.mensaje =
        'Validación de ejemplo completada. La contraseña de tu cuenta no se ha modificado; falta conectar el backend.';
      return;
    }
    for (const campo of tarjeta.campos) this.datos[campo.clave] = this.borrador[campo.clave].trim();
    this.editando[id] = false;
    this.mensaje = 'Cambios aplicados solo en esta vista. No se guardaron en el servidor.';
  }

  cancelarEdicion(id: TarjetaId): void {
    const tarjeta = this.tarjetas.find((item) => item.id === id)!;
    for (const campo of tarjeta.campos) this.borrador[campo.clave] = this.datos[campo.clave];
    this.errores[id] = '';
    this.editando[id] = false;
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  informarEliminacion(): void {
    this.mensaje = 'La eliminación de cuenta todavía no está conectada al backend.';
  }
}
