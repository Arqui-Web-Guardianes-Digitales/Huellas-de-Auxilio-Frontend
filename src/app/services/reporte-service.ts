import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Reporte, ResumenReportes, Ubicacion } from '../model/reporte';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiURL;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.token()}`,
    });
  }

  // E23: Resumen de reportes para el dashboard
  obtenerResumenCiudadano(idCiudadano: number): Observable<ResumenReportes> {
    return this.http.get<ResumenReportes>(`${this.url}/reportes/ciudadano/${idCiudadano}/resumen`, {
      headers: this.getHeaders(),
    });
  }

  // E22: Listar reportes del ciudadano
  listarPorCiudadano(idCiudadano: number): Observable<Reporte[]> {
    return this.http.get<Reporte[]>(`${this.url}/reportes/ciudadano/${idCiudadano}`, {
      headers: this.getHeaders(),
    });
  }

  // E58: Subir imagen al servidor
  subirImagen(archivo: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ url: string }>(`${this.url}/archivos/subir`, formData, {
      headers: this.getHeaders(),
    });
  }

  // E10: Crear Ubicación
  crearUbicacion(ubicacion: Ubicacion): Observable<Ubicacion> {
    return this.http.post<Ubicacion>(`${this.url}/ubicacion`, ubicacion, {
      headers: this.getHeaders(),
    });
  }

  // E12: Registrar Reporte
  crearReporte(reporte: any): Observable<Reporte> {
    return this.http.post<Reporte>(`${this.url}/reporte`, reporte, { headers: this.getHeaders() });
  }

  // E13: Registrar evidencia fotográfica asociada al reporte
  guardarEvidencia(idReporte: number, urlEvidencia: string): Observable<any> {
    const payload = {
      reporte: { idReporte: idReporte },
      urlEvidencia: urlEvidencia,
    };
    return this.http.post(`${this.url}/evidenciareporte`, payload, { headers: this.getHeaders() });
  }

  obtenerReportePorId(idReporte: number, idCiudadano: number): Observable<Reporte> {
    return this.http.get<Reporte>(
      `${this.url}/reporte/${idReporte}/ciudadano/${idCiudadano}`,
      { headers: this.getHeaders() }
    );
  }
}
