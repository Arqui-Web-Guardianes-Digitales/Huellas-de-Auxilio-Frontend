import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '../../services/auth-service';
import {RegistroStateService} from '../../services/registro-state-service';
@Component({selector:'app-confirmacion-entidad-component',imports:[FormsModule,RouterLink],templateUrl:'./confirmacion-entidad-component.html',styleUrl:'./confirmacion-entidad-component.css'})
export class ConfirmacionEntidadComponent {
  private readonly auth=inject(AuthService);private readonly state=inject(RegistroStateService);private readonly router=inject(Router);
  contrasena='';confirmar='';acepto=false;error='';cargando=false;
  submit():void {
    this.error='';
    if(!this.state.entidad){this.error='Primero completa los datos de la entidad.';return;}
    if(this.contrasena.length<8){this.error='La contraseña debe tener al menos 8 caracteres.';return;}
    if(this.contrasena!==this.confirmar){this.error='Las contraseñas no coinciden.';return;}
    if(!this.acepto){this.error='Debes aceptar los términos y la política de privacidad.';return;}
    this.cargando=true;
    this.auth.registrarEntidad(this.state.entidad,this.contrasena).subscribe({
      next:()=>{this.cargando=false;this.contrasena='';this.confirmar='';this.state.limpiar();void this.router.navigateByUrl('/cuenta-registrada-entidad');},
      error:(e:HttpErrorResponse)=>{this.cargando=false;this.error=e.status===0?'No se pudo conectar con el backend.':'No se completó el registro. Verifica el correo y los datos ingresados. Si ya se creó el usuario, revisa con el equipo backend.';}
    });
  }
}
