import { Component, OnInit, inject } from '@angular/core';
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

  menuMobileAbierto: boolean = false;

  // Estadísticas con valores por defecto de la maqueta
  resumen: ResumenReportes = {
    total: 4,
    enRevision: 2,
    atendidos: 1,
  };

  // Último reporte para el card de seguimiento reciente
  ultimoReporte: Reporte | null = null;
  nombreUsuario: string = 'HuellaAmiga247';

  ngOnInit(): void {
    // Protección de ruta: Solo para ciudadanos con sesión iniciada
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Intentamos cargar estadísticas reales si existen en el backend (idCiudadano = 1 por defecto de momento)
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    const idCiudadanoPrueba = 1; // Correspondiente al Juan de import.sql
    this.reporteService.obtenerResumenCiudadano(idCiudadanoPrueba).subscribe({
      next: (datos) => {
        if (datos) {
          this.resumen = datos;
        }
      },
      error: () => {
        // Si no responde el backend por alguna razón, mantiene los datos visuales de la maqueta
        console.log('Mostrando datos base de la maqueta.');
      },
    });

    this.reporteService.listarPorCiudadano(idCiudadanoPrueba).subscribe({
      next: (reportes) => {
        if (reportes && reportes.length > 0) {
          this.ultimoReporte = reportes[0];
        }
      },
      error: () => {},
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
}
