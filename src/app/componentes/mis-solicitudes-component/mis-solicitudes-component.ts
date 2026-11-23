import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { Solicitud } from '../../model/solicitud';
import { Mascota } from '../../model/mascota';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { SolicitudService } from '../../services/solicitud-service';

interface FilaSolicitud {
  solicitud: Solicitud;
  nombreMascota: string;
  nombreEntidad: string;
  fotoMascota: string | null;
}

@Component({
  selector: 'app-mis-solicitudes-component',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './mis-solicitudes-component.html',
  styleUrl: './mis-solicitudes-component.css',
})
export class MisSolicitudesComponent implements OnInit {
  get rutaCuenta(): string { return this.auth.rutaMiCuenta(); }

  private readonly auth = inject(AuthService);
  private readonly solicitudes = inject(SolicitudService);
  private readonly mascotas = inject(MascotaService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  idCiudadano: number | null = null;
  filas: FilaSolicitud[] = [];
  menuAbierto = false;
  nombreCiudadano = 'Ciudadano';
  nombreMascota = '';
  estado = '';
  cargando = true;
  error = '';

  ngOnInit(): void {
    console.log("Identificando al ciudadano para consultar sus solicitudes");
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')
      || !this.auth.correo()) {
      void this.router.navigateByUrl('/login');
      return;
    }

    this.auth.obtenerPerfilCiudadanoDB().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (perfil) => {
        console.log("Respuesta recibida: identificando al ciudadano para consultar sus solicitudes", { cantidad: Array.isArray(perfil) ? perfil.length : null, respuestaRecibida: perfil != null });
        const id = perfil?.idCiudadano;
        if (id == null || !Number.isSafeInteger(id) || id <= 0) {
          this.mostrarError('No se pudo identificar tu perfil de ciudadano.');
          return;
        }
        this.idCiudadano = id;
        this.nombreCiudadano = perfil.nombreCompleto?.trim() || 'Ciudadano';
        this.cargando = false;
        this.cargarSolicitudes();
      },
      error: () => (console.log("Error durante la operación: identificando al ciudadano para consultar sus solicitudes"), this.mostrarError('No se pudo cargar tu perfil. Vuelve a iniciar sesión.')),
    });
  }

  cargarSolicitudes(): void {
    console.log("Consultando las solicitudes del ciudadano");
    if (this.idCiudadano === null || this.cargando) return;

    this.cargando = true;
    this.error = '';
    const nombre = this.nombreMascota.trim();
    const peticion = nombre || this.estado
      ? this.solicitudes.filtrarSolicitudes(this.idCiudadano, nombre, this.estado)
      : this.solicitudes.listarPorCiudadano(this.idCiudadano);

    peticion.pipe(
      switchMap((datos) => {
        if (datos === null) throw new Error('La API no devolvió una lista.');
        return this.cargarNombres(datos);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (filas) => {
        console.log("Respuesta recibida: consultando las solicitudes del ciudadano", { cantidad: Array.isArray(filas) ? filas.length : null, respuestaRecibida: filas != null });
        this.filas = filas;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => (console.log("Error durante la operación: consultando las solicitudes del ciudadano"), this.mostrarError('No se pudieron cargar tus solicitudes. Intenta nuevamente.')),
    });
  }

  limpiarFiltros(): void {
    console.log("Limpiando los filtros de solicitudes del ciudadano");
    this.nombreMascota = '';
    this.estado = '';
    this.cargarSolicitudes();
  }

  etiquetaEstado(estado?: string): string {
    switch (estado) {
      case 'ENVIADA': return 'Enviada';
      case 'EN_REVISION': return 'En revisión';
      case 'APROBADA': return 'Aprobada';
      case 'RECHAZADA': return 'Rechazada';
      default: return 'Estado no disponible';
    }
  }

  private cargarNombres(solicitudes: Solicitud[]): Observable<FilaSolicitud[]> {
    console.log("Consultando los nombres de las mascotas de las solicitudes");
    if (solicitudes.length === 0) return of([]);

    const ids = [...new Set(solicitudes.map((s) => s.mascotaIdMascota))];
    return forkJoin(ids.map((id) => this.mascotas.buscarPorId(id).pipe(
      catchError(() => of(null)),
    ))).pipe(
      switchMap((mascotas) => {
        const porId = new Map<number, Mascota | null>();
        ids.forEach((id, i) => porId.set(id, mascotas[i] ?? null));
        const entidades = new Set<number>();
        for (const mascota of mascotas) {
          if (mascota?.entidadIdEntidad) entidades.add(mascota.entidadIdEntidad);
        }
        const idsEntidad = [...entidades];
        const contactos = idsEntidad.length
          ? forkJoin(idsEntidad.map((id) => this.mascotas.buscarEntidadPorId(id).pipe(
            map((entidad) => entidad?.nombreEntidad ?? 'Entidad no disponible'),
            catchError(() => of('Entidad no disponible')),
          )))
          : of([] as string[]);

        return contactos.pipe(map((nombres) => {
          const porEntidad = new Map<number, string>();
          idsEntidad.forEach((id, i) => porEntidad.set(id, nombres[i]));
          return solicitudes.map((solicitud) => {
            const mascota = porId.get(solicitud.mascotaIdMascota);
            return {
              solicitud,
              fotoMascota: mascota?.urlFoto?.trim() || null,
              nombreMascota: mascota?.nombre ?? 'Mascota no disponible',
              nombreEntidad: porEntidad.get(mascota?.entidadIdEntidad ?? 0)
                ?? 'Entidad no disponible',
            };
          });
        }));
      }),
    );
  }

  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    this.cargando = false;
    this.cdr.markForCheck();
  }
}
