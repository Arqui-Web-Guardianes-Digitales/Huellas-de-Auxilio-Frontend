import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from '../model/auth-response';
import { Ciudadano, DatosCiudadano } from '../model/ciudadano';
import { Entidad, DatosEntidad } from '../model/entidad';
import { Usuario } from '../model/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiURL;

  // HU03: Request del backend: { correo, contraseña }. Response: { jwt, roles }.
  login(correo: string, contraseña: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/authenticate`, { correo, contraseña });
  }

  iniciarSesion(respuesta: AuthResponse, correo?: string): void {
    sessionStorage.setItem('jwt', respuesta.jwt);
    sessionStorage.setItem('roles', JSON.stringify(respuesta.roles));
    if (correo) {
      sessionStorage.setItem('correo', correo.trim().toLowerCase());
    }
  }

  correo(): string | null {
    return sessionStorage.getItem('correo');
  }

  // El login de entidad conserva el JWT, cuyo subject es el correo del usuario.
  // Aquí solo leemos la identidad y la caducidad; la API valida la firma del token.
  correoEntidad(): string | null {
    try {
      const partes = this.token()?.split('.');
      if (!partes || partes.length !== 3 || partes.some((parte) => !parte)) return null;
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
        (caracter) => caracter.charCodeAt(0));
      const datos = JSON.parse(new TextDecoder().decode(bytes));
      if (typeof datos.sub !== 'string' || !datos.sub.trim()
        || typeof datos.exp !== 'number' || !Number.isFinite(datos.exp)
        || datos.exp * 1000 <= Date.now()) return null;
      return datos.sub.trim();
    } catch {
      return null;
    }
  }

  idEntidad(): number | null {
    const id = Number(sessionStorage.getItem('idEntidad'));
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  guardarDatosEntidad(id: number, nombre: string): void {
    sessionStorage.setItem('idEntidad', id.toString());
    sessionStorage.setItem('nombreEntidad', nombre);
  }

  limpiarDatosEntidad(): void {
    sessionStorage.removeItem('idEntidad');
    sessionStorage.removeItem('nombreEntidad');
  }

  obtenerPerfilEntidadDB(): Observable<Entidad | null> {
    const correo = this.correoEntidad();
    if (!correo) return throwError(() => new Error('La sesión de entidad no es válida.'));
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.token()}` });

    return this.http.get<Usuario | null>(
      `${this.url}/usuario/correo/${encodeURIComponent(correo)}`, { headers },
    ).pipe(
      switchMap((usuario) => {
        if (!usuario) return of(null);
        if (!Number.isSafeInteger(usuario.idUsuario) || usuario.idUsuario! <= 0
          || usuario.correo?.toLowerCase() !== correo.toLowerCase()) {
          return throwError(() => new Error('La API no devolvió el usuario de la sesión.'));
        }
        return this.http.get<Entidad | null>(
          `${this.url}/entidad/usuario/${usuario.idUsuario}`, { headers },
        ).pipe(
          map((entidad) => {
            if (!entidad) return null;
            if (!Number.isSafeInteger(entidad.idEntidad) || entidad.idEntidad! <= 0
              || entidad.idUsuario !== usuario.idUsuario
              || typeof entidad.nombreEntidad !== 'string' || !entidad.nombreEntidad.trim()) {
              throw new Error('La API no devolvió un perfil de entidad válido para el usuario.');
            }
            return entidad;
          }),
        );
      }),
    );
  }

  idCiudadano(): number {
    return Number(sessionStorage.getItem('idCiudadano')) || 1;
  }

  guardarDatosCiudadano(id: number, nombre: string): void {
    sessionStorage.setItem('idCiudadano', id.toString());
    sessionStorage.setItem('nombreCiudadano', nombre);
  }

  nombreCiudadano(): string {
    return sessionStorage.getItem('nombreCiudadano') || 'Ciudadano';
  }

  token(): string | null {
    return sessionStorage.getItem('jwt');
  }

  roles(): string[] {
    try {
      return JSON.parse(sessionStorage.getItem('roles') || '[]') as string[];
    } catch {
      return [];
    }
  }

  cerrarSesion(): void {
    sessionStorage.clear();
  }

  // Buscamos el ID real del ciudadano usando su correo en sesión
  obtenerPerfilCiudadanoDB(): Observable<Ciudadano> {
    const correo = this.correo();
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.token()}` });

    // chicos aquí primero se busca el Usuario por correo, luego el Ciudadano por idUsuario
    return this.http
      .get<Usuario>(`${this.url}/usuario/correo/${correo}`, { headers })
      .pipe(
        switchMap((user) =>
          this.http.get<Ciudadano>(`${this.url}/ciudadano/usuario/${user.idUsuario}`, { headers }),
        ),
      );
  }

  // HU01: El backend separa el alta en DOS recursos: usuario -> ciudadano.
  registrarCiudadano(datos: DatosCiudadano, contraseña: string): Observable<Ciudadano> {
    const usuario: Usuario = {
      idRol: 1,
      correo: datos.correo.trim().toLowerCase(),
      telefono: datos.telefono.trim(),
      contraseña,
    };
    return this.http.post<Usuario>(`${this.url}/usuario`, usuario).pipe(
      switchMap((creado) => {
        if (!creado?.idUsuario)
          throw new Error('No se recibió el identificador del usuario creado.');
        const ciudadano: Ciudadano = {
          dni: datos.dni,
          distrito: datos.distrito,
          nombreCompleto: '',
          idUsuario: creado.idUsuario,
        };
        return this.http.post<Ciudadano>(`${this.url}/ciudadano`, ciudadano).pipe(
          map((perfil) => {
            if (!perfil?.idCiudadano)
              throw new Error('La API no confirmó el registro del ciudadano.');
            return perfil;
          }),
        );
      }),
    );
  }

  // HU02: usuario -> entidad; no inventar endpoints.
  registrarEntidad(datos: DatosEntidad, contraseña: string): Observable<Entidad> {
    const usuario: Usuario = {
      idRol: 2,
      correo: datos.correo.trim().toLowerCase(),
      telefono: datos.telefono.trim(),
      contraseña,
    };
    return this.http.post<Usuario>(`${this.url}/usuario`, usuario).pipe(
      switchMap((creado) => {
        if (!creado?.idUsuario)
          throw new Error('No se recibió el identificador del usuario creado.');
        return this.http
          .post<Entidad>(`${this.url}/entidad`, {
            nombreEntidad: datos.nombreEntidad,
            tipoEntidad: datos.tipoEntidad,
            zonaAtencion: datos.zonaAtencion,
            idUsuario: creado.idUsuario,
          } satisfies Entidad)
          .pipe(
            map((perfil) => {
              if (!perfil?.idEntidad)
                throw new Error('La API no confirmó el registro de la entidad.');
              return perfil;
            }),
          );
      }),
    );
  }
}
