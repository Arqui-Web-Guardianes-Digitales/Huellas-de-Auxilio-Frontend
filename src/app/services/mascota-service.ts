import { Injectable, inject, Service } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Entidad } from '../model/entidad';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Mascota } from '../model/mascota';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class MascotaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  private readonly fotoRespaldo = '/icons/huella-verde.png';

  urlFotoMascota(url?: string | null): string {
    const valor = url?.trim();
    if (!valor) return this.fotoRespaldo;

    if (/^https?:\/\//i.test(valor)) return valor;

    if (/^\/?imagenes\//i.test(valor)) {
      return new URL('/' + valor.replace(/^\//, ''), this.url).href;
    }

    if (/^\/?img\//i.test(valor)) {
      return '/' + valor.replace(/^\//, '');
    }

    return this.fotoRespaldo;
  }

  mostrarFotoDeRespaldo(evento: Event): void {
    const imagen = evento.currentTarget;
    if (imagen instanceof HTMLImageElement && imagen.getAttribute('src') !== this.fotoRespaldo) {
      imagen.src = this.fotoRespaldo;
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.token()}`,
    });
  }

  listarDisponibles(): Observable<Mascota[]> {
    return this.http.get<Mascota[]>(`${this.url}/mascotas`, {
      headers: this.getHeaders(),
    });
  }

  buscarPorId(idMascota: number): Observable<Mascota | null> {
    return this.http.get<Mascota | null>(`${this.url}/mascota/${idMascota}`, {
      headers: this.getHeaders(),
    });
  }

  buscarEntidadPorId(idEntidad: number): Observable<Entidad | null> {
    return this.http.get<Entidad | null>(`${this.url}/entidad/detalle/${idEntidad}`, {
      headers: this.getHeaders(),
    });
  }

  filtrarMascotas(
    nombre: string,
    especie: string,
    edad: string,
    distrito: string,
  ): Observable<Mascota[]> {
    const nombreFiltro = encodeURIComponent(nombre.trim() || 'todos');
    const especieFiltro = encodeURIComponent(especie.trim() || 'todos');
    const edadFiltro = encodeURIComponent(edad.trim() || 'todos');
    const distritoFiltro = encodeURIComponent(distrito.trim() || 'todos');

    return this.http.get<Mascota[]>(
      `${this.url}/mascotas/filtrar/${nombreFiltro}/${especieFiltro}/${edadFiltro}/${distritoFiltro}`,
      {
        headers: this.getHeaders(),
      },
    );
  }
}
