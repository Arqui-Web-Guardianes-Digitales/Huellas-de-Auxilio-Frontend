import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Reporte } from '../../model/reporte';

@Component({
  selector: 'app-seguimiento-reporte-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './seguimiento-reporte-component.html',
  styleUrl: './seguimiento-reporte-component.css',
})
export class SeguimientoReporteComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute); // Para sacar el ID de la URL
  private readonly cdr = inject(ChangeDetectorRef);

  menuMobileAbierto: boolean = false;
  nombreUsuario: string = 'Ciudadano';

  // Aquí guardaremos toda la data del reporte
  reporte: Reporte | null = null;
  cargando: boolean = true;
  errorCarga: boolean = false;

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.nombreUsuario = this.auth.nombreCiudadano();

    // Obtenemos el ID de la URL (ej: /seguimiento-reporte/1)
    const idParam = this.route.snapshot.paramMap.get('id');
    const idReporte = idParam ? Number(idParam) : null;

    if (idReporte) {
      this.cargarDetalleReporte(idReporte);
    } else {
      this.errorCarga = true;
      this.cargando = false;
    }
  }

  cargarDetalleReporte(idReporte: number): void {
    const idCiudadano = this.auth.idCiudadano();

    this.reporteService.obtenerReportePorId(idReporte, idCiudadano).subscribe({
      next: (data) => {
        if (data) {
          this.reporte = data;
        } else {
          this.errorCarga = true;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorCarga = true;
        this.cargando = false;
        this.cdr.detectChanges();
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
