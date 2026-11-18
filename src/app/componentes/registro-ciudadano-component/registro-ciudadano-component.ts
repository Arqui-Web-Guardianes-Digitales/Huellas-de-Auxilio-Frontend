import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {RegistroStateService} from '../../services/registro-state-service';
import {DatosCiudadano} from '../../model/ciudadano';
@Component({selector:'app-registro-ciudadano-component',imports:[FormsModule,RouterLink],templateUrl:'./registro-ciudadano-component.html',styleUrl:'./registro-ciudadano-component.css'})
export class RegistroCiudadanoComponent {
  private readonly state=inject(RegistroStateService);private readonly router=inject(Router);
  datos:DatosCiudadano=this.state.ciudadano ? {...this.state.ciudadano}:{dni:'',correo:'',distrito:'',telefono:''};
  error='';
  submit():void {
    this.error='';
    if(!/^\d{8}$/.test(this.datos.dni)){this.error='El DNI debe contener exactamente 8 dígitos.';return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.datos.correo)){this.error='Escribe un correo electrónico válido.';return;}
    if(!this.datos.distrito.trim()){this.error='Completa el distrito.';return;}
    if(this.datos.telefono && !/^\+?[\d\s-]{7,15}$/.test(this.datos.telefono)){this.error='Revisa el formato del teléfono.';return;}
    this.state.ciudadano={...this.datos};void this.router.navigateByUrl('/confirmacion-ciudadano');
  }
}
