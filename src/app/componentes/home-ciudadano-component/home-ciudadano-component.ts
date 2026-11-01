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
  private readonly cdr = inject(ChangeDetectorRef); // <-- Para pintar de inmediato en pantalla

  menuMobileAbierto: boolean = false;

  // Estadísticas que se actualizarán con el backend
  resumen: ResumenReportes = {
    total: 0,
    enRevision: 0,
    atendidos: 0,
  };

  ultimoReporte: Reporte | null = null;
  nombreUsuario: string = 'Ciudadano';

  ngOnInit(): void {
    // Si no hay token o no es ciudadano, al login
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.nombreUsuario = this.auth.nombreCiudadano();

    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    // ID dinámico del ciudadano que inició sesión (o 1 por defecto)
    const idCiudadano = this.auth.idCiudadano();

    // Cargar números estadísticos
    this.reporteService.obtenerResumenCiudadano(idCiudadano).subscribe({
      next: (datos) => {
        if (datos) {
          this.resumen = datos;
          this.cdr.detectChanges();
        }
      },
      error: (e) => {
        console.log('Error o sin reportes para el usuario:', e);
      },
    });

    // Cargar el último reporte para la tarjeta de seguimiento
    this.reporteService.listarPorCiudadano(idCiudadano).subscribe({
      next: (reportes) => {
        if (reportes && reportes.length > 0) {
          this.ultimoReporte = reportes[0];
          this.cdr.detectChanges(); // Chicos aquí se fuerza a Angular a mostrar cambios de inmediato
        }
      },
      error: (e) => {
        console.log('Sin historial de reportes:', e);
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
}
