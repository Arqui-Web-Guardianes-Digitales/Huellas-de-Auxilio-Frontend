import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MensajeRecuperacion { mensaje: string; }

/** HU04: la contraseña nunca se envía por email; solo un enlace temporal. */
@Injectable({ providedIn: 'root' })
export class RecuperacionService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiURL;

  solicitar(correo: string): Observable<MensajeRecuperacion> {
    return this.http.post<MensajeRecuperacion>(`${this.url}/auth/password/forgot`, {
      correo: correo.trim().toLowerCase(),
    });
  }

  restablecer(token: string, nuevaContrasena: string, confirmarContrasena: string): Observable<MensajeRecuperacion> {
    return this.http.post<MensajeRecuperacion>(`${this.url}/auth/password/reset`, {
      token, nuevaContrasena, confirmarContrasena,
    });
  }
}
