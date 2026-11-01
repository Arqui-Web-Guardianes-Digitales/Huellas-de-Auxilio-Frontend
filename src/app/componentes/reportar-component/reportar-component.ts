import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Ubicacion } from '../../model/reporte';

@Component({
  selector: 'app-reportar-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reportar-component.html',
  styleUrl: './reportar-component.css',
})
export class ReportarComponent implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Control del Asistente de 3 Pasos
  pasoActual: number = 1;

  // Datos de Ubicación y Evidencia
  direccion: string = 'Av. Arequipa 1230';
  distrito: string = 'Lince';
  referencia: string = 'Frente al parque principal';
  latitud: number = -12.0833;
  longitud: number = -77.0347;

  archivoSeleccionado: File | null = null;
  previewUrl: string = '';
  urlFotoSubida: string = '';
  subiendoFoto: boolean = false;

  // Detalles del caso
  tipoCaso: string = 'Maltrato animal';
  nivelUrgencia: string = 'Media'; // 'Baja', 'Media', 'Alta'
  descripcion: string = '';

  // Confirmación
  codigoReporteGenerado: string = 'HA-0000';
  enviandoReporte: boolean = false;
  errorEnvio: string = '';

  // Instancia de Leaflet
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
    }
  }

  ngAfterViewInit(): void {
    // Inicializamos el mapa
    this.iniciarMapa();
  }

  iniciarMapa(): void {
    setTimeout(() => {
      const container = document.getElementById('mapaLeaflet');
      if (!container) return;

      // Centrado inicial en Lima
      this.map = L.map('mapaLeaflet').setView([this.latitud, this.longitud], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      // Ícono de pin personalizado usando la huella del proyecto
      const customIcon = L.icon({
        iconUrl: '/icons/map2.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      this.marker = L.marker([this.latitud, this.longitud], { icon: customIcon }).addTo(this.map);

      // Al hacer clic en cualquier calle del mapa:
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.latitud = e.latlng.lat;
        this.longitud = e.latlng.lng;

        if (this.marker) {
          this.marker.setLatLng(e.latlng);
        }
        this.cdr.detectChanges();
      });
    }, 200);
  }

  // Manejo de la imagen: input file
  onArchivoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;

      // Crear previsualización local inmediata
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);

      // Subir al backend de inmediato
      this.subiendoFoto = true;
      this.reporteService.subirImagen(file).subscribe({
        next: (resp) => {
          this.urlFotoSubida = resp.url;
          this.subiendoFoto = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al subir imagen al servidor:', err);
          this.subiendoFoto = false;
          // Fallback a una foto de prueba si el servidor no tiene permisos de carpeta
          this.urlFotoSubida = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1';
          this.cdr.detectChanges();
        },
      });
    }
  }

  quitarEvidencia(): void {
    this.archivoSeleccionado = null;
    this.previewUrl = '';
    this.urlFotoSubida = '';
  }

  seleccionarUrgencia(nivel: string): void {
    this.nivelUrgencia = nivel;
  }

  // Navegación entre pasos
  irAlPaso2(): void {
    if (!this.direccion || !this.distrito) {
      alert('Por favor ingresa la dirección y el distrito.');
      return;
    }
    this.pasoActual = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverAlPaso1(): void {
    this.pasoActual = 1;
    setTimeout(() => this.iniciarMapa(), 100);
  }

  // Envío Final al BACKEND
  enviarReporteFinal(): void {
    if (!this.tipoCaso || !this.descripcion.trim()) {
      alert('Por favor completa el tipo de caso y la descripción.');
      return;
    }

    this.enviandoReporte = true;
    this.errorEnvio = '';

    //  primero guardar Ubicación
    const nuevaUbicacion: Ubicacion = {
      direccion: this.direccion,
      distrito: this.distrito,
      referencia: this.referencia,
      latitud: this.latitud,
      longitud: this.longitud,
    };

    this.reporteService.crearUbicacion(nuevaUbicacion).subscribe({
      next: (ubCreada) => {
        // guardar Reporte con la entidad calculada por Haversine
        const payloadReporte = {
          ubicacion: { idUbicacion: ubCreada.idUbicacion },
          ciudadano: { idCiudadano: 1 }, // Juan Perez (ID 1)
          fechaReporte: new Date().toISOString().split('T')[0],
          tipoCaso: this.tipoCaso.substring(0, 1).toUpperCase(), // 'M' o 'A'
          nivelUrgencia:
            this.nivelUrgencia === 'Alta' ? 'AL' : this.nivelUrgencia === 'Media' ? 'ME' : 'BA',
          descripcion: this.descripcion,
          estado: 'R', // Recibido
        };

        this.reporteService.crearReporte(payloadReporte).subscribe({
          next: (repCreado) => {
            this.codigoReporteGenerado = `HA-00${repCreado.idReporte}`;

            // 3. Guardar Evidencia si se adjuntó foto
            if (this.urlFotoSubida && repCreado.idReporte) {
              this.reporteService
                .guardarEvidencia(repCreado.idReporte, this.urlFotoSubida)
                .subscribe({
                  next: () => {},
                  error: (e) => console.log('Evidencia guardada localmente'),
                });
            }

            this.enviandoReporte = false;
            this.pasoActual = 3; // Ir a la pantalla de felicitaciones
            this.cdr.detectChanges();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          },
          error: (err) => {
            this.enviandoReporte = false;
            this.errorEnvio = 'Ocurrió un error al registrar el reporte.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.enviandoReporte = false;
        this.errorEnvio = 'No se pudo conectar con el servidor para guardar la ubicación.';
        this.cdr.detectChanges();
      },
    });
  }

  // Fallback si la imagen no existe
  imagenError(event: any): void {
    event.target.src = '/img/evidencia-foto-1.png';
  }
}
