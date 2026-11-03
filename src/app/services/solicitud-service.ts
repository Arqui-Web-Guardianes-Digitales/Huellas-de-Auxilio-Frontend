import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Solicitud } from '../model/solicitud';
import { Usuario } from '../model/usuario';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class SolicitudService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.token()}`,
    });
  }

  insertar(idCiudadano: number, solicitud: Solicitud): Observable<Solicitud | null> {
    const datos = {
      mascotaIdMascota: solicitud.mascotaIdMascota,
      tipoVivienda: solicitud.tipoVivienda,
      motivo: solicitud.motivo,
      experiencia: solicitud.experiencia,
    };

    return this.http.post<Solicitud | null>(
      `${this.url}/solicitud/ciudadano/${idCiudadano}`,
      datos,
      {
        headers: this.getHeaders(),
      },
    );
  }

  obtenerUsuarioPorCorreo(correo: string): Observable<Usuario | null> {
    return this.http.get<Usuario | null>(
      `${this.url}/usuario/correo/${encodeURIComponent(correo)}`,
      {
        headers: this.getHeaders(),
      },
    );
  }

  listarPorCiudadano(idCiudadano: number): Observable<Solicitud[] | null> {
    return this.http.get<Solicitud[] | null>(`${this.url}/solicitudes/ciudadano/${idCiudadano}`, {
      headers: this.getHeaders(),
    });
  }

  buscarPorCodigoYCiudadano(
    idSolicitud: number,
    idCiudadano: number,
  ): Observable<Solicitud | null> {
    return this.http.get<Solicitud | null>(
      `${this.url}/solicitud/ciudadano/${idCiudadano}/${idSolicitud}`,
      {
        headers: this.getHeaders(),
      },
    );
  }

  filtrarSolicitudes(
    idCiudadano: number,
    nombreMascota: string,
    estado: string,
  ): Observable<Solicitud[] | null> {
    const nombreFiltro = encodeURIComponent(nombreMascota.trim() || 'todos');

    const estadoFiltro = encodeURIComponent(estado.trim() || 'todos');

    return this.http.get<Solicitud[] | null>(
      `${this.url}/solicitudes/ciudadano/${idCiudadano}/filtrar/${nombreFiltro}/${estadoFiltro}`,
      {
        headers: this.getHeaders(),
      },
    );
  }
}
