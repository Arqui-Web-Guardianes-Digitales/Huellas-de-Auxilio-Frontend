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
    console.log('ngOnInit de SeguimientoReporteComponent');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.log('Sesión inválida en Seguimiento, redirigiendo a /login');
      this.router.navigateByUrl('/login');
      return;
    }
    this.nombreUsuario = this.auth.nombreCiudadano();

    const idParam = this.route.snapshot.paramMap.get('id');
    const idReporte = idParam ? Number(idParam) : null;
    console.log('ID de reporte capturado desde la ruta:', idReporte);

    if (idReporte) {
      this.cargarDetalleReporte(idReporte);
    } else {
      console.log('No se proporcionó un ID de reporte válido');
      this.errorCarga = true;
      this.cargando = false;
    }
  }

  cargarDetalleReporte(idReporte: number): void {
    const idCiudadano = this.auth.idCiudadano();
    console.log('Consultando detalle del reporte:', { idReporte, idCiudadano });

    this.reporteService.obtenerReportePorId(idReporte, idCiudadano).subscribe({
      next: (data) => {
        console.log('Detalle del reporte recibido:', data);
        if (data) {
          this.reporte = data;
          this.reporteService.obtenerEvidencias(idReporte).subscribe({
            next: (evs) => {
              console.log('Evidencias del reporte recibidas:', evs);
              this.evidencias = evs;
              this.cdr.detectChanges();
            },
            error: (err) => console.log('Error al cargar evidencias del reporte:', err),
          });
          setTimeout(() => this.iniciarMapa(), 100);
        } else {
          this.errorCarga = true;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log('Error al cargar detalle del reporte:', err);
        this.errorCarga = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  iniciarMapa(): void {
    const lat = this.reporte?.ubicacion?.latitud || -12.0833;
    const lng = this.reporte?.ubicacion?.longitud || -77.0347;
    console.log('Inicializando mapa de visualización en coordenadas:', { lat, lng });

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
    console.log('No se pudo cargar imagen de evidencia, usando respaldo');
    event.target.src = '/img/evidencia-foto-1.png';
  }

  abrirMenu(): void {
    console.log('Click en abrir menú móvil (Seguimiento)');
    this.menuMobileAbierto = true;
  }

  cerrarMenu(): void {
    console.log('Click en cerrar menú móvil (Seguimiento)');
    this.menuMobileAbierto = false;
  }

  cerrarSesion(): void {
    console.log('Cerrando sesión desde Seguimiento');
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
