import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RecuperacionService } from '../../services/recuperacion-service';
import { AlertaComponent } from '../alerta-component/alerta-component';

@Component({
  selector: 'app-recuperar-cuenta-component',
  imports: [FormsModule, RouterLink, AlertaComponent],
  templateUrl: './recuperar-cuenta-component.html',
  styleUrl: './recuperar-cuenta-component.css',
})
export class RecuperarCuentaComponent {
  private readonly servicio = inject(RecuperacionService);
  private readonly cdr = inject(ChangeDetectorRef);
  correo = '';
  error = '';
  exito = '';
  cargando = false;

  submit(): void {
    this.error = '';
    this.exito = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo.trim())) {
      this.error = 'Ingresa un correo electrónico válido.';
      return;
    }
    if (this.cargando) return;
    this.cargando = true;
    this.servicio.solicitar(this.correo).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.exito = respuesta.mensaje;
        this.cdr.markForCheck();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = e.status === 0
          ? 'No pudimos conectar con el servidor. Inténtalo nuevamente.'
          : 'No se pudo procesar la solicitud. Vuelve a intentarlo.';
        this.cdr.markForCheck();
      },
    });
  }
}
