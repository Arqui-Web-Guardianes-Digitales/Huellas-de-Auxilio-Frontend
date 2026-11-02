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
  nombreUsuario: string = 'Ciudadano';

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }

    // MAGIA: Traemos los datos REALES del ciudadano logueado
    this.auth.obtenerPerfilCiudadanoDB().subscribe({
      next: (ciudadano) => {
        if (ciudadano && ciudadano.idCiudadano) {
          this.auth.guardarDatosCiudadano(
            ciudadano.idCiudadano,
            ciudadano.nombreCompleto || 'Ciudadano',
          );
          this.nombreUsuario = this.auth.nombreCiudadano();
          this.cargarEstadisticas();
        }
      },
      error: () => {
        this.cargarEstadisticas(); // Fallback por si acaso
      },
    });
  }

  fotoReciente: string = '/img/evidencia-foto-3.png'; // Foto por defecto

  cargarEstadisticas(): void {
    const idCiudadano = this.auth.idCiudadano();

    this.reporteService.obtenerResumenCiudadano(idCiudadano).subscribe({
      next: (datos) => {
        if (datos) {
          this.resumen = datos;
          this.cdr.detectChanges();
        }
      },
    });

    this.reporteService.listarPorCiudadano(idCiudadano).subscribe({
      next: (reportes) => {
        if (reportes && reportes.length > 0) {
          this.ultimoReporte = reportes[0];
          this.reporteService.obtenerEvidencias(this.ultimoReporte.idReporte!).subscribe((evs) => {
            if (evs && evs.length > 0) {
              this.fotoReciente = evs[0].urlEvidencia; // Sacamos la URL real del JSON
            }
            this.cdr.detectChanges();
          });
        }
      },
    });
  }

  abrirMenu(): void {
    this.menuMobileAbierto = true;
  }
  cerrarMenu(): void {
    this.menuMobileAbierto = false;
  }
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  imagenError(event: any): void {
    event.target.src = '/img/evidencia-foto-3.png';
  }
}
