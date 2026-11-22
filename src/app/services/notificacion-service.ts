import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, defer, map, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth-service';
import { Usuario } from '../model/usuario';
import { Ciudadano } from '../model/ciudadano';
import { Entidad } from '../model/entidad';
import { Notificacion, SesionNotificaciones } from '../model/notificacion';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  private headers(): HttpHeaders {
    const token = this.auth.token();
    if (!token) throw new Error('La sesión no es válida.');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  obtenerSesion(): Observable<SesionNotificaciones> {
    return defer(() => {
      const roles = this.auth.roles();
      const entidad = roles.includes('ROLE_ENTIDAD');
      if (!entidad && !roles.includes('ROLE_CIUDADANO')) throw new Error('El rol no es válido.');
      const correo = entidad ? this.auth.correoEntidad() : this.auth.correo();
      if (!correo) throw new Error('No se encontró el usuario de la sesión.');
      const headers = this.headers();
      return this.http.get<Usuario | null>(
        `${this.url}/usuario/correo/${encodeURIComponent(correo)}`, { headers },
      ).pipe(
        switchMap(usuario => {
          if (!usuario || !Number.isSafeInteger(usuario.idUsuario) || usuario.idUsuario! <= 0
            || usuario.correo?.trim().toLowerCase() !== correo.trim().toLowerCase()) {
            throw new Error('No se pudo identificar al usuario de la sesión.');
          }
          const idUsuario = usuario.idUsuario!;
          if (entidad) {
            return this.http.get<Entidad | null>(`${this.url}/entidad/usuario/${idUsuario}`, { headers }).pipe(
              map(perfil => {
                if (!perfil || perfil.idUsuario !== idUsuario || !Number.isSafeInteger(perfil.idEntidad) || perfil.idEntidad! <= 0) {
                  throw new Error('No se encontró el perfil de la entidad.');
                }
                return { idUsuario, idPerfil: perfil.idEntidad!, rol: 'ENTIDAD', nombre: perfil.nombreEntidad } as SesionNotificaciones;
              }),
            );
          }
          return this.http.get<Ciudadano | null>(`${this.url}/ciudadano/usuario/${idUsuario}`, { headers }).pipe(
            map(perfil => {
              if (!perfil || perfil.idUsuario !== idUsuario || !Number.isSafeInteger(perfil.idCiudadano) || perfil.idCiudadano! <= 0) {
                throw new Error('No se encontró el perfil del ciudadano.');
              }
              return { idUsuario, idPerfil: perfil.idCiudadano!, rol: 'CIUDADANO', nombre: perfil.nombreCompleto } as SesionNotificaciones;
            }),
          );
        }),
      );
    });
  }

  listarPorUsuario(idUsuario: number): Observable<Notificacion[]> {
    return defer(() => this.http.get<Notificacion[]>(
      `${this.url}/notificaciones/usuario/${idUsuario}`, { headers: this.headers() },
    )).pipe(map(notificaciones => {
      if (!Array.isArray(notificaciones)) throw new Error('La respuesta de notificaciones no es válida.');
      return notificaciones;
    }));
  }

  marcarComoLeida(idNotificacion: number): Observable<Notificacion> {
    return defer(() => this.http.put<Notificacion | null>(
      `${this.url}/notificacion/leer/${idNotificacion}`, null, { headers: this.headers() },
    )).pipe(map(notificacion => {
      if (!notificacion || notificacion.idNotificacion !== idNotificacion || notificacion.estadoNotificacion !== true) {
        throw new Error('El servidor no confirmó la lectura de la notificación.');
      }
      return notificacion;
    }));
  }
}
