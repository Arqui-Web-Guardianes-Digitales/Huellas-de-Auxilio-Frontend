import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RecuperacionService } from '../../services/recuperacion-service';
import { AlertaComponent } from '../alerta-component/alerta-component';

@Component({
  selector: 'app-nueva-contrasena-component',
  imports: [FormsModule, RouterLink, AlertaComponent],
  templateUrl: './nueva-contrasena-component.html',
  styleUrl: './nueva-contrasena-component.css',
})
export class NuevaContrasenaComponent implements OnInit {
  private readonly servicio = inject(RecuperacionService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);
  token = '';
  contrasena = '';
  confirmar = '';
  error = '';
  exito = '';
  cargando = false;

  ngOnInit(): void {
    this.token = this.ruta.snapshot.queryParamMap.get('token') ?? '';
    // Quitar el token del historial/URL visible tras capturarlo en memoria.
    if (this.token) this.location.replaceState('/nueva-contrasena');
    else this.error = 'El enlace no es válido. Solicita uno nuevo desde Recuperar contraseña.';
  }

  submit(): void {
    this.error = '';
    if (!this.token) {
      this.error = 'Primero solicita un enlace de recuperación.';
      return;
    }
    const bytes = new TextEncoder().encode(this.contrasena).length;
    if (bytes < 8 || bytes > 72) {
      this.error = 'La contraseña debe tener entre 8 y 72 bytes.';
      return;
    }
    if (this.contrasena !== this.confirmar) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.cargando) return;
    this.cargando = true;
    this.servicio.restablecer(this.token, this.contrasena, this.confirmar).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.exito = respuesta.mensaje;
        this.token = ''; // No admitir un segundo envío con el mismo enlace.
        this.contrasena = '';
        this.confirmar = '';
        this.cdr.markForCheck();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = e.status === 400
          ? 'El enlace no es válido, ya fue usado o venció. Solicita uno nuevo.'
          : e.status === 0 ? 'No pudimos conectar con el servidor.'
          : 'No se pudo actualizar tu contraseña. Inténtalo de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
