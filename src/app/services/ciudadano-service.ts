import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, defer, map, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth-service';
import { Ciudadano } from '../model/ciudadano';
import { Usuario } from '../model/usuario';

export interface DatosPersonales {
  nombreCompleto: string;
  dni: string;
  distrito: string;
}

export interface DatosContacto {
  correo: string;
  telefono: string;
}

export interface CambioContrasena {
  contrasenaActual: string;
  nuevaContrasena: string;
  confirmarContrasena: string;
}

export interface PerfilCiudadano extends DatosPersonales, DatosContacto {
  idUsuario: number;
  idCiudadano: number;
}

type UsuarioPerfil = Pick<Usuario, 'idUsuario' | 'correo' | 'telefono'>;

@Injectable({ providedIn: 'root' })
export class CiudadanoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  private headers(): HttpHeaders {
    const token = this.auth.token();
    if (!token) {
      throw new Error('La sesión no es válida. Inicia sesión nuevamente.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  obtenerPerfil(): Observable<PerfilCiudadano> {
    return defer(() => {
      const correo = this.auth.correo()?.trim();
      if (!correo) {
        throw new Error('No se encontró el correo de la sesión.');
      }

      const headers = this.headers();

      return this.http.get<UsuarioPerfil | null>(
        `${this.url}/usuario/correo/${encodeURIComponent(correo)}`,
        { headers },
      ).pipe(
        switchMap((usuario) => {
          if (
            !usuario ||
            !Number.isSafeInteger(usuario.idUsuario) ||
            usuario.idUsuario! <= 0 ||
            usuario.correo?.toLowerCase() !== correo.toLowerCase()
          ) {
            throw new Error('No se pudo identificar al usuario de la sesión.');
          }

          return this.http.get<Ciudadano | null>(
            `${this.url}/ciudadano/usuario/${usuario.idUsuario}`,
            { headers },
          ).pipe(
            map((ciudadano): PerfilCiudadano => {
              if (
                !ciudadano ||
                !Number.isSafeInteger(ciudadano.idCiudadano) ||
                ciudadano.idCiudadano! <= 0 ||
                ciudadano.idUsuario !== usuario.idUsuario
              ) {
                throw new Error('No se encontró el perfil del ciudadano.');
              }

              return {
                idUsuario: usuario.idUsuario!,
                idCiudadano: ciudadano.idCiudadano!,
                nombreCompleto: ciudadano.nombreCompleto || '',
                dni: ciudadano.dni || '',
                distrito: ciudadano.distrito || '',
                correo: usuario.correo,
                telefono: usuario.telefono || '',
              };
            }),
          );
        }),
      );
    });
  }

  actualizarPersonales(
    idCiudadano: number,
    datos: DatosPersonales,
  ): Observable<void> {
    return defer(() => {
      this.validarId(idCiudadano);

      return this.http.put(
        `${this.url}/ciudadano/perfil/${idCiudadano}`,
        {
          nombreCompleto: datos.nombreCompleto.trim(),
          dni: datos.dni.trim(),
          distrito: datos.distrito.trim(),
        },
        { headers: this.headers(), responseType: 'text' },
      );
    }).pipe(
      map((respuesta) => {
        if (respuesta.trim() !== 'Perfil actualizado correctamente') {
          throw new Error(
            'No se pudo guardar el perfil. Revisa los datos y que el DNI no esté registrado en otra cuenta.',
          );
        }
      }),
    );
  }

  actualizarContacto(
    idUsuario: number,
    datos: DatosContacto,
  ): Observable<void> {
    return defer(() => {
      this.validarId(idUsuario);

      return this.http.put(
        `${this.url}/usuario/perfil/contacto/${idUsuario}`,
        {
          correo: datos.correo.trim().toLowerCase(),
          telefono: datos.telefono.trim(),
        },
        { headers: this.headers(), responseType: 'text' },
      );
    }).pipe(
      map((respuesta) => {
        if (respuesta.trim() !== 'Contacto actualizado correctamente') {
          throw new Error(
            'No se pudo guardar el contacto. Revisa el teléfono y que el correo no esté registrado en otra cuenta.',
          );
        }
      }),
    );
  }

  cambiarContrasena(
    correo: string,
    datos: CambioContrasena,
  ): Observable<void> {
    return defer(() => {
      if (!correo.trim()) {
        throw new Error('No se encontró el correo del usuario.');
      }

      return this.http.put(
        `${this.url}/usuario/perfil/contrasena/${encodeURIComponent(correo.trim())}`,
        {
          contrasenaActual: datos.contrasenaActual,
          nuevaContrasena: datos.nuevaContrasena,
          confirmarContrasena: datos.confirmarContrasena,
        },
        { headers: this.headers(), responseType: 'text' },
      );
    }).pipe(
      map((respuesta) => {
        if (respuesta.trim() !== 'Contraseña actualizada correctamente') {
          throw new Error(
            'No se pudo cambiar la contraseña. Verifica la contraseña actual y la confirmación.',
          );
        }
      }),
    );
  }

  desactivarCuenta(
    idUsuario: number,
    correo: string,
    contrasena: string,
  ): Observable<Usuario | null> {
    return defer(() => {
      this.validarId(idUsuario);

      return this.http.put<Usuario | null>(
        `${this.url}/usuario/usuario/${idUsuario}`,
        { correo, contraseña: contrasena },
        { headers: this.headers() },
      );
    });
  }

  private validarId(id: number): void {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('El identificador del perfil no es válido.');
    }
  }
}
