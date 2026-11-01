import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {AuthResponse} from '../model/auth-response';
import {Ciudadano, DatosCiudadano} from '../model/ciudadano';
import {Entidad, DatosEntidad} from '../model/entidad';
import {Usuario} from '../model/usuario';

@Injectable({ providedIn:'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiURL;

  // HU03: Request del backend: { correo, contraseña }. Response: { jwt, roles }.
  login(correo:string, contraseña:string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/authenticate`, {correo, contraseña});
  }
  iniciarSesion(respuesta: AuthResponse):void {
    // Sesión temporal: borrar token cerrando la pestaña o al cerrar sesión.
    sessionStorage.setItem('jwt', respuesta.jwt);
    sessionStorage.setItem('roles', JSON.stringify(respuesta.roles));
  }
  token():string|null { return sessionStorage.getItem('jwt'); }
  roles():string[] {
    try { return JSON.parse(sessionStorage.getItem('roles') || '[]') as string[]; }
    catch { return []; }
  }
  cerrarSesion():void { sessionStorage.removeItem('jwt'); sessionStorage.removeItem('roles'); }

  // HU01: El backend separa el alta en DOS recursos: usuario -> ciudadano.
  registrarCiudadano(datos: DatosCiudadano, contraseña: string): Observable<Ciudadano> {
    const usuario: Usuario = {
      idRol: 1, correo: datos.correo.trim().toLowerCase(), telefono: datos.telefono.trim(), contraseña
    };
    return this.http.post<Usuario>(`${this.url}/usuario`, usuario).pipe(
      switchMap(creado => {
        if (!creado?.idUsuario) throw new Error('No se recibió el identificador del usuario creado.');
        const ciudadano: Ciudadano = {dni:datos.dni, distrito:datos.distrito, nombreCompleto:'', idUsuario:creado.idUsuario};
        return this.http.post<Ciudadano>(`${this.url}/ciudadano`, ciudadano).pipe(
          map(perfil => {
            if (!perfil?.idCiudadano) throw new Error('La API no confirmó el registro del ciudadano.');
            return perfil;
          })
        );
      })
    );
  }
  // HU02: usuario -> entidad; no inventar endpoints.
  registrarEntidad(datos: DatosEntidad, contraseña:string):Observable<Entidad> {
    const usuario: Usuario = {
      idRol: 2, correo: datos.correo.trim().toLowerCase(), telefono: datos.telefono.trim(), contraseña
    };
    return this.http.post<Usuario>(`${this.url}/usuario`, usuario).pipe(
      switchMap(creado => {
        if (!creado?.idUsuario) throw new Error('No se recibió el identificador del usuario creado.');
        return this.http.post<Entidad>(`${this.url}/entidad`, {
          nombreEntidad:datos.nombreEntidad, tipoEntidad:datos.tipoEntidad,
          zonaAtencion:datos.zonaAtencion, idUsuario:creado.idUsuario
        } satisfies Entidad).pipe(
          map(perfil => {
            if (!perfil?.idEntidad) throw new Error('La API no confirmó el registro de la entidad.');
            return perfil;
          })
        );
      })
    );
  }
}
