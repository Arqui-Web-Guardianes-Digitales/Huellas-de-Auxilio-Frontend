import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Reporte, ResumenReportes } from '../model/reporte';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  // Metodo auxiliar para agregar el Token JWT a cada llamada protegida
  private getHeaders(): HttpHeaders {
    const token = this.auth.token();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // E23: Obtener resumen estadístico de reportes del ciudadano
  obtenerResumenCiudadano(idCiudadano: number): Observable<ResumenReportes> {
    return this.http.get<ResumenReportes>(`${this.url}/reportes/ciudadano/${idCiudadano}/resumen`, {
      headers: this.getHeaders(),
    });
  }

  // E22: Listar todos los reportes del ciudadano
  listarPorCiudadano(idCiudadano: number): Observable<Reporte[]> {
    return this.http.get<Reporte[]>(`${this.url}/reportes/ciudadano/${idCiudadano}`, {
      headers: this.getHeaders(),
    });
  }
}
