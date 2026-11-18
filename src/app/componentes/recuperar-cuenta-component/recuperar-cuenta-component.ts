import {Component} from '@angular/core';import {FormsModule} from '@angular/forms';import {RouterLink} from '@angular/router';
@Component({selector:'app-recuperar-cuenta-component',imports:[FormsModule,RouterLink],templateUrl:'./recuperar-cuenta-component.html',styleUrl:'./recuperar-cuenta-component.css'})
export class RecuperarCuentaComponent {
  correo='';error='';
  submit():void {
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo)){this.error='Ingresa un correo válido.';return;}
    // HU04: no se promete envío: la API NO tiene endpoint de verificación por correo.
    this.error='La recuperación por correo aún no está disponible: el backend no cuenta con un endpoint de verificación ni envío de correos.';
  }
}
