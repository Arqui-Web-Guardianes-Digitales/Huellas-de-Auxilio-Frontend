import { Injectable } from '@angular/core';
import { DatosCiudadano } from '../model/ciudadano';
import { DatosEntidad } from '../model/entidad';
// Conserva temporalmente los datos entre las dos pantallas (sin almacenar contraseña).
@Injectable({providedIn:'root'})
export class RegistroStateService {
  ciudadano: DatosCiudadano | null = null;
  entidad: DatosEntidad | null = null;
  limpiar():void {this.ciudadano=null;this.entidad=null;}
}
