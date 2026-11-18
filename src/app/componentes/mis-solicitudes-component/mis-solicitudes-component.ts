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
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')
      || !this.auth.correo()) {
      void this.router.navigateByUrl('/login');
      return;
    }

    this.auth.obtenerPerfilCiudadanoDB().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (perfil) => {
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
      error: () => this.mostrarError('No se pudo cargar tu perfil. Vuelve a iniciar sesión.'),
    });
  }

  cargarSolicitudes(): void {
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
        this.filas = filas;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => this.mostrarError('No se pudieron cargar tus solicitudes. Intenta nuevamente.'),
    });
  }

  limpiarFiltros(): void {
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
