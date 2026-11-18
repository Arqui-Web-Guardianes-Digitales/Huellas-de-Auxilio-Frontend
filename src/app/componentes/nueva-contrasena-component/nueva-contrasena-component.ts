import {Component} from '@angular/core';import {FormsModule} from '@angular/forms';import {RouterLink} from '@angular/router';
@Component({selector:'app-nueva-contrasena-component',imports:[FormsModule,RouterLink],templateUrl:'./nueva-contrasena-component.html',styleUrl:'./nueva-contrasena-component.css'})
export class NuevaContrasenaComponent {
  contrasena='';confirmar='';error='La actualización está deshabilitada hasta implementar la verificación segura del correo en el backend.';
  submit():void {this.error='Primero verifica tu correo mediante un enlace seguro de recuperación (pendiente en backend).';}
}
