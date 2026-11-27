import { Component, Input } from '@angular/core';

/** Mensaje reutilizable para la autenticación (sin ventanas alert() del navegador). */
@Component({
  selector: 'app-alerta',
  standalone: true,
  templateUrl: './alerta-component.html',
  styleUrl: './alerta-component.css',
})
export class AlertaComponent {
  @Input() mensaje = '';
  @Input() tipo: 'error' | 'exito' | 'info' = 'error';
}
