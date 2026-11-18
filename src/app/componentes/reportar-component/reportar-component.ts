import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Ubicacion } from '../../model/reporte';

@Component({
  selector: 'app-reportar-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reportar-component.html',
  styleUrl: './reportar-component.css',
})
export class ReportarComponent implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  reporteForm: FormGroup;
  pasoActual: number = 1;

  archivoSeleccionado: File | null = null;
  previewUrl: string = '';
  urlFotoSubida: string = '';
  subiendoFoto: boolean = false;

  codigoReporteGenerado: string = 'HA-0000';
  enviandoReporte: boolean = false;
  errorEnvio: string = '';

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  constructor() {
    this.reporteForm = this.fb.group({
      direccion: [
        'Av. Arequipa 1230',
        [Validators.required, Validators.minLength(4), Validators.maxLength(200)],
      ],
      distrito: [
        'Lince',
        [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,100}$/)],
      ],
      referencia: ['Frente al parque principal', [Validators.maxLength(200)]],
      latitud: [-12.0833, [Validators.required]],
      longitud: [-77.0347, [Validators.required]],
      tipoCaso: ['Maltrato animal', [Validators.required]],
      nivelUrgencia: ['Media', [Validators.required, Validators.pattern(/^(Baja|Media|Alta)$/)]],
      descripcion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    console.log('ngOnInit de ReportarComponent (ReactiveForms)');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.log('Acceso denegado en Reportar, redirigiendo a /login');
      this.router.navigateByUrl('/login');
    }
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit: inicializando mapa Leaflet');
    this.iniciarMapa();
  }

  campoInvalido(campo: string): boolean {
    const control = this.reporteForm.get(campo);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  iniciarMapa(): void {
    setTimeout(() => {
      const container = document.getElementById('mapaLeaflet');
      if (!container) return;

      const latInicial = this.reporteForm.value.latitud;
      const lngInicial = this.reporteForm.value.longitud;

      this.map = L.map('mapaLeaflet').setView([latInicial, lngInicial], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      const customIcon = L.icon({
        iconUrl: '/icons/map2.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      this.marker = L.marker([latInicial, lngInicial], { icon: customIcon }).addTo(this.map);

      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        this.reporteForm.patchValue({ latitud: lat, longitud: lng });
        console.log('Click en mapa - nuevas coordenadas:', { latitud: lat, longitud: lng });

        if (this.marker) {
          this.marker.setLatLng(e.latlng);
        }

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then((res) => res.json())
          .then((data) => {
            console.log('Respuesta de geocodificación inversa (Nominatim):', data);
            if (data && data.address) {
              const calle = (
                data.address.road ||
                data.address.pedestrian ||
                data.address.suburb ||
                'Calle sin nombre'
              ).slice(0, 200);
              const ref = (data.display_name || '').split(',').slice(0, 3).join(',').slice(0, 200);
              this.reporteForm.patchValue({ direccion: calle, referencia: ref });
              this.cdr.detectChanges();
            }
          })
          .catch((err) => console.log('Coordenadas fijadas sin dirección externa:', err));

        this.cdr.detectChanges();
      });
    }, 200);
  }

  onArchivoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      console.log('Archivo de imagen seleccionado:', file.name, file.size);
      this.archivoSeleccionado = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);

      this.subiendoFoto = true;
      this.reporteService.subirImagen(file).subscribe({
        next: (resp) => {
          console.log('Imagen subida exitosamente al servidor:', resp);
          this.urlFotoSubida = resp.url;
          this.subiendoFoto = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.log('Error al subir imagen al servidor, usando fallback:', err);
          this.subiendoFoto = false;
          this.urlFotoSubida = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1';
          this.cdr.detectChanges();
        },
      });
    }
  }

  quitarEvidencia(): void {
    console.log('Click en quitar evidencia seleccionada');
    this.archivoSeleccionado = null;
    this.previewUrl = '';
    this.urlFotoSubida = '';
  }

  seleccionarUrgencia(nivel: string): void {
    console.log('Nivel de urgencia seleccionado:', nivel);
    this.reporteForm.patchValue({ nivelUrgencia: nivel });
  }

  irAlPaso2(): void {
    const camposPaso1 = ['direccion', 'distrito', 'referencia', 'latitud', 'longitud'];
    let invalido = false;
    for (const nombre of camposPaso1) {
      const control = this.reporteForm.get(nombre);
      control?.markAsTouched();
      if (control?.invalid) invalido = true;
    }
    if (invalido) {
      console.log('Formulario Paso 1 no válido, revisa los campos obligatorios');
      return;
    }

    console.log('Avanzando al Paso 2 - Datos de ubicación:', this.reporteForm.value);
    this.pasoActual = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverAlPaso1(): void {
    console.log('Regresando al Paso 1 - Ubicación y evidencia');
    this.pasoActual = 1;
    setTimeout(() => this.iniciarMapa(), 100);
  }

  enviarReporteFinal(): void {
    if (this.reporteForm.invalid) {
      console.log('Formulario no válido');
      this.reporteForm.markAllAsTouched();
      return;
    }

    const v = this.reporteForm.value;
    console.log('Datos aceptados del formulario reactivo:', v);

    this.enviandoReporte = true;
    this.errorEnvio = '';

    const nuevaUbicacion: Ubicacion = {
      direccion: v.direccion.trim(),
      distrito: v.distrito.trim(),
      referencia: (v.referencia || '').trim(),
      latitud: v.latitud,
      longitud: v.longitud,
    };

    this.reporteService.crearUbicacion(nuevaUbicacion).subscribe({
      next: (ubCreada) => {
        console.log('Ubicación creada en BD:', ubCreada);
        const idCiudadanoSesion = this.auth.idCiudadano();

        const payloadReporte = {
          ubicacion: { idUbicacion: ubCreada.idUbicacion },
          ciudadano: { idCiudadano: idCiudadanoSesion },
          fechaReporte: new Date().toISOString().split('T')[0],
          tipoCaso: v.tipoCaso.substring(0, 1).toUpperCase(),
          nivelUrgencia:
            v.nivelUrgencia === 'Alta' ? 'AL' : v.nivelUrgencia === 'Media' ? 'ME' : 'BA',
          descripcion: v.descripcion.trim(),
          estado: 'R',
        };
        console.log('Datos de reporte aceptados, enviando al backend:', payloadReporte);

        this.reporteService.crearReporte(payloadReporte).subscribe({
          next: (repCreado) => {
            console.log('Reporte creado exitosamente en BD:', repCreado);
            this.codigoReporteGenerado = `HA-00${repCreado.idReporte}`;

            if (this.urlFotoSubida && repCreado.idReporte) {
              this.reporteService
                .guardarEvidencia(repCreado.idReporte, this.urlFotoSubida)
                .subscribe({
                  next: (evResp) => {
                    console.log('Evidencia guardada en BD:', evResp);
                    this.finalizarReporteExitoso();
                  },
                  error: (err) => {
                    console.log('Error al guardar evidencia en BD:', err);
                    this.finalizarReporteExitoso();
                  },
                });
            } else {
              this.finalizarReporteExitoso();
            }
          },
          error: (err) => {
            console.log('Error al crear reporte:', err);
            this.enviandoReporte = false;
            this.errorEnvio = 'Ocurrió un error al registrar el reporte.';
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.log('Error al crear ubicación:', err);
        this.enviandoReporte = false;
        this.errorEnvio = 'No se pudo conectar con el servidor para guardar la ubicación.';
        this.cdr.detectChanges();
      },
    });
  }

  finalizarReporteExitoso(): void {
    console.log(
      'Flujo de reporte finalizado, mostrando Paso 3. Código:',
      this.codigoReporteGenerado,
    );
    this.enviandoReporte = false;
    this.pasoActual = 3;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  imagenError(event: any): void {
    console.log('Error cargando previsualización de imagen');
    event.target.src = '/img/evidencia-foto-1.png';
  }
}
