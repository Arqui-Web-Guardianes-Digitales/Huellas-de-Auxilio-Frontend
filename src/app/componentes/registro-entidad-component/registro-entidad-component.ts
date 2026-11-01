import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {RegistroStateService} from '../../services/registro-state-service';
import {DatosEntidad} from '../../model/entidad';
@Component({selector:'app-registro-entidad-component',imports:[FormsModule,RouterLink],templateUrl:'./registro-entidad-component.html',styleUrl:'./registro-entidad-component.css'})
export class RegistroEntidadComponent {
  private readonly state=inject(RegistroStateService);private readonly router=inject(Router);
  datos:DatosEntidad=this.state.entidad ? {...this.state.entidad}:{nombreEntidad:'',tipoEntidad:'',correo:'',zonaAtencion:'',telefono:''};error='';
  submit():void {
    this.error='';
    if(!this.datos.nombreEntidad.trim()||!this.datos.tipoEntidad||!this.datos.zonaAtencion.trim()||!this.datos.telefono.trim()) {this.error='Completa los datos obligatorios de tu entidad.';return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.datos.correo)){this.error='Escribe un correo electrónico válido.';return;}
    if(!/^\+?[\d\s-]{7,15}$/.test(this.datos.telefono)){this.error='Revisa el formato del teléfono.';return;}
    this.state.entidad={...this.datos};void this.router.navigateByUrl('/confirmacion-entidad');
  }
}
