import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, defer, map, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth-service';
import { Entidad } from '../model/entidad';
import { Usuario } from '../model/usuario';

export interface CuentaEntidad {
  entidad: Entidad;
  usuario: Pick<Usuario, 'idUsuario' | 'correo' | 'telefono'>;
}

export interface ResultadoContacto {
  correo: string;
  telefono: string;
  correoModificado: boolean;
}

@Injectable({ providedIn: 'root' })
export class EntidadService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  listarEntidades(): Observable<Entidad[]> {
    return defer(() => this.http.get<Entidad[]>(
      `${this.url}/entidades`, { headers: this.headers() },
    ));
  }

  obtenerContacto(idUsuario: number): Observable<Pick<Usuario, 'idUsuario' | 'telefono'> | null> {
    return defer(() => this.http.get<Pick<Usuario, 'idUsuario' | 'telefono'> | null>(
      `${this.url}/usuario/${idUsuario}/contacto`, { headers: this.headers() },
    ));
  }

  obtenerPerfil(): Observable<Entidad | null> {
    return defer(() => this.auth.obtenerPerfilEntidadDB());
  }

  private headers(): HttpHeaders {
    const token = this.auth.token();
    if (!token) throw new Error('La sesión no es válida.');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  obtenerCuenta(): Observable<CuentaEntidad> {
    return defer(() => {
      const correo = this.auth.correoEntidad();
      if (!correo) throw new Error('La sesión de entidad no es válida.');
      const headers = this.headers();

      return this.http.get<Usuario | null>(
        `${this.url}/usuario/correo/${encodeURIComponent(correo)}`, { headers },
      ).pipe(
        switchMap((usuario) => {
          if (!usuario || !Number.isSafeInteger(usuario.idUsuario) || usuario.idUsuario! <= 0
            || usuario.correo?.toLowerCase() !== correo.toLowerCase()) {
            throw new Error('No se encontró el usuario de la sesión.');
          }

          return this.http.get<Entidad | null>(
            `${this.url}/entidad/usuario/${usuario.idUsuario}`, { headers },
          ).pipe(
            map((entidad): CuentaEntidad => {
              if (!entidad || !Number.isSafeInteger(entidad.idEntidad) || entidad.idEntidad! <= 0
                || entidad.idUsuario !== usuario.idUsuario) {
                throw new Error('No se encontró la entidad asociada al usuario.');
              }
              return {
                entidad,
                usuario: {
                  idUsuario: usuario.idUsuario,
                  correo: usuario.correo,
                  telefono: usuario.telefono || '',
                },
              };
            }),
          );
        }),
      );
    });
  }

  actualizarContacto(idUsuario: number, correo: string, telefono: string): Observable<ResultadoContacto> {
    return defer(() => {
      if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
        throw new Error('El identificador del usuario no es válido.');
      }
      const correoSesion = this.auth.correoEntidad();
      if (!correoSesion) throw new Error('La sesión de entidad no es válida.');
      const headers = this.headers();
      const correoIngresado = correo.trim().toLowerCase();
      const telefonoIngresado = telefono.trim();

      return this.http.get<Usuario | null>(
        `${this.url}/usuario/correo/${encodeURIComponent(correoSesion)}`, { headers },
      ).pipe(
        switchMap((usuario) => {
          if (!usuario || usuario.idUsuario !== idUsuario
            || usuario.correo?.toLowerCase() !== correoSesion.toLowerCase()) {
            throw new Error('No se pudo confirmar el usuario de la sesión.');
          }
          const correoModificado = correoIngresado !== usuario.correo.trim().toLowerCase();

          return this.http.put(
            `${this.url}/usuario/perfil/contacto/${idUsuario}`,
            { correo: correoIngresado, telefono: telefonoIngresado },
            { headers, responseType: 'text' },
          ).pipe(
            map((respuesta): ResultadoContacto => {
              if (respuesta.trim() !== 'Contacto actualizado correctamente') {
                throw new Error('No se pudo actualizar el contacto. Revisa los datos y que el correo no esté registrado en otra cuenta.');
              }
              return { correo: correoIngresado, telefono: telefonoIngresado, correoModificado };
            }),
          );
        }),
      );
    });
  }

  cambiarContrasena(
    correo: string,
    contrasenaActual: string,
    nuevaContrasena: string,
    confirmarContrasena: string,
  ): Observable<void> {
    return defer(() => {
      if (!correo.trim()) throw new Error('No se encontró el correo del usuario.');
      return this.http.put(
        `${this.url}/usuario/perfil/contrasena/${encodeURIComponent(correo)}`,
        { contrasenaActual, nuevaContrasena, confirmarContrasena },
        { headers: this.headers(), responseType: 'text' },
      );
    }).pipe(
      map((respuesta) => {
        if (respuesta.trim() !== 'Contraseña actualizada correctamente') {
          throw new Error('No se pudo cambiar la contraseña. Verifica la contraseña actual y la confirmación.');
        }
      }),
    );
  }

  desactivarCuenta(idUsuario: number, correo: string, contrasena: string): Observable<Usuario | null> {
    return defer(() => {
      if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
        throw new Error('El identificador del usuario no es válido.');
      }
      return this.http.put<Usuario | null>(
        `${this.url}/usuario/usuario/${idUsuario}`,
        { correo, contraseña: contrasena },
        { headers: this.headers() },
      );
    });
  }

  actualizarEntidad(
    idEntidad: number,
    datos: Entidad,
  ): Observable<Entidad | null> {
    return defer(() => {
      const token = this.auth.token();

      if (!token) {
        throw new Error('La sesión no es válida. Inicia sesión nuevamente.');
      }

      if (!Number.isSafeInteger(idEntidad) || idEntidad <= 0) {
        throw new Error('El identificador de la entidad no es válido.');
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      return this.http.put<Entidad | null>(
        `${this.url}/entidades/${idEntidad}`,
        {
          nombreEntidad: datos.nombreEntidad.trim(),
          tipoEntidad: datos.tipoEntidad.trim(),
          zonaAtencion: datos.zonaAtencion.trim(),
        },
        { headers },
      );
    });
  }
}
