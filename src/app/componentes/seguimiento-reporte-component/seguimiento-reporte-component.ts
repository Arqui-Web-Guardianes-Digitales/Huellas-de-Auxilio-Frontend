import { Component, OnInit, inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

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
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  menuMobileAbierto: boolean = false;
  nombreUsuario: string = 'Ciudadano';

  reporte: Reporte | null = null;
  evidencias: any[] = [];
  cargando: boolean = true;
  errorCarga: boolean = false;

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.nombreUsuario = this.auth.nombreCiudadano();

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
          // Buscamos las fotos reales
          this.reporteService.obtenerEvidencias(idReporte).subscribe((evs) => {
            this.evidencias = evs;
            this.cdr.detectChanges();
          });
          // Iniciamos el mapa después de cargar los datos
          setTimeout(() => this.iniciarMapa(), 100);
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

  iniciarMapa(): void {
    const lat = this.reporte?.ubicacion?.latitud || -12.0833;
    const lng = this.reporte?.ubicacion?.longitud || -77.0347;

    // Mapa estático (sin zoom ni arrastre para que solo sea visual)
    const map = L.map('mapaVisualizacion', {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
    }).setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const customIcon = L.icon({
      iconUrl: '/icons/map2.png',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
    L.marker([lat, lng], { icon: customIcon }).addTo(map);
  }

  imagenError(event: any): void {
    event.target.src = '/img/evidencia-foto-1.png';
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
