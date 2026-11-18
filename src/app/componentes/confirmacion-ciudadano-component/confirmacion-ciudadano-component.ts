import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '../../services/auth-service';
import {RegistroStateService} from '../../services/registro-state-service';
@Component({selector:'app-confirmacion-ciudadano-component',imports:[FormsModule,RouterLink],templateUrl:'./confirmacion-ciudadano-component.html',styleUrl:'./confirmacion-ciudadano-component.css'})
export class ConfirmacionCiudadanoComponent {
  private readonly auth=inject(AuthService);private readonly state=inject(RegistroStateService);private readonly router=inject(Router);
  contrasena='';confirmar='';acepto=false;error='';cargando=false;
  submit():void {
    this.error='';
    if(!this.state.ciudadano){this.error='Primero completa tus datos principales.';return;}
    if(this.contrasena.length<8){this.error='La contraseña debe tener al menos 8 caracteres.';return;}
    if(this.contrasena!==this.confirmar){this.error='Las contraseñas no coinciden.';return;}
    if(!this.acepto){this.error='Debes aceptar los términos y la política de privacidad.';return;}
    this.cargando=true;
    this.auth.registrarCiudadano(this.state.ciudadano,this.contrasena).subscribe({
      next:()=>{this.cargando=false;this.contrasena='';this.confirmar='';this.state.limpiar();void this.router.navigateByUrl('/cuenta-registrada-ciudadano');},
      error:(e:HttpErrorResponse)=>{this.cargando=false;this.error=e.status===0?'No se pudo conectar con el backend.':'No se completó el registro. Revisa si el DNI o correo ya existen. Si el usuario se creó pero falló el perfil, solicita apoyo al equipo backend.';}
    });
  }
}
