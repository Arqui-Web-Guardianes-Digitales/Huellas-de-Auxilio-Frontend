import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { ResumenReportes, Reporte } from '../../model/reporte';

@Component({
  selector: 'app-home-ciudadano-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-ciudadano-component.html',
  styleUrl: './home-ciudadano-component.css',
})
export class HomeCiudadanoComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly reporteService = inject(ReporteService);
  private readonly cdr = inject(ChangeDetectorRef);

  menuMobileAbierto: boolean = false;
  resumen: ResumenReportes = { total: 0, enRevision: 0, atendidos: 0 };
  ultimoReporte: Reporte | null = null;
  fotoReciente: string = '/img/evidencia-foto-3.png';
  nombreUsuario: string = 'Ciudadano';

  ngOnInit(): void {
    console.log('ngOnInit de HomeCiudadanoComponent');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.log('Sesión no válida o rol incorrecto, redirigiendo a /login');
      this.router.navigateByUrl('/login');
      return;
    }

    this.auth.obtenerPerfilCiudadanoDB().subscribe({
      next: (ciudadano) => {
        console.log('Perfil de ciudadano recibido:', ciudadano);
        if (ciudadano && ciudadano.idCiudadano) {
          this.auth.guardarDatosCiudadano(
            ciudadano.idCiudadano,
            ciudadano.nombreCompleto || 'Ciudadano',
          );
          this.nombreUsuario = this.auth.nombreCiudadano();
          this.cargarEstadisticas();
        }
      },
      error: (err) => {
        console.log('Error al obtener perfil del ciudadano, usando fallback:', err);
        this.cargarEstadisticas();
      },
    });
  }

  cargarEstadisticas(): void {
    const idCiudadano = this.auth.idCiudadano();
    console.log('Cargando estadísticas para idCiudadano:', idCiudadano);

    this.reporteService.obtenerResumenCiudadano(idCiudadano).subscribe({
      next: (datos) => {
        console.log('Resumen de reportes recibido:', datos);
        if (datos) {
          this.resumen = datos;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.log('Error al cargar resumen:', err),
    });

    this.reporteService.listarPorCiudadano(idCiudadano).subscribe({
      next: (reportes) => {
        console.log('Listado de reportes recibido en Home:', reportes);
        if (reportes && reportes.length > 0) {
          const listaOrdenada = reportes.sort((a, b) => (b.idReporte || 0) - (a.idReporte || 0));
          this.ultimoReporte = listaOrdenada[0];
          console.log('Último reporte seleccionado:', this.ultimoReporte);

          this.reporteService.obtenerEvidencias(this.ultimoReporte.idReporte!).subscribe({
            next: (evs) => {
              console.log('Evidencias del último reporte:', evs);
              if (evs && evs.length > 0) {
                this.fotoReciente = evs[0].urlEvidencia;
              }
              this.cdr.detectChanges();
            },
            error: (err) => console.log('Error al obtener evidencias:', err),
          });
        }
      },
      error: (err) => console.log('Error al listar reportes en Home:', err),
    });
  }

  abrirMenu(): void {
    console.log('Click en abrir menú móvil (HomeCiudadano)');
    this.menuMobileAbierto = true;
  }

  cerrarMenu(): void {
    console.log('Click en cerrar menú móvil (HomeCiudadano)');
    this.menuMobileAbierto = false;
  }

  cerrarSesion(): void {
    console.log('Cerrando sesión del ciudadano...');
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  imagenError(event: any): void {
    console.log('Imagen no encontrada, aplicando imagen por defecto');
    event.target.src = '/img/evidencia-foto-3.png';
  }
}
