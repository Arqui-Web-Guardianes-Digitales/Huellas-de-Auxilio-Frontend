import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Reporte, ResumenReportes } from '../../model/reporte';

@Component({
  selector: 'app-mis-reportes-component',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './mis-reportes-component.html',
  styleUrl: './mis-reportes-component.css',
})
export class MisReportesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  menuMobileAbierto: boolean = false;
  nombreUsuario: string = 'Ciudadano';

  resumen: ResumenReportes = { total: 0, enRevision: 0, atendidos: 0 };

  reportesOriginales: Reporte[] = [];
  reportesFiltrados: Reporte[] = [];

  filtroCodigo: string = '';
  filtroEstado: string = '';
  filtroUrgencia: string = '';
  filtroDistrito: string = '';

  ngOnInit(): void {
    console.log('ngOnInit de MisReportesComponent');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.log('Sesión no válida en MisReportes, redirigiendo a /login');
      this.router.navigateByUrl('/login');
      return;
    }

    this.auth.obtenerPerfilCiudadanoDB().subscribe({
      next: (ciudadano) => {
        console.log('Perfil ciudadano obtenido en MisReportes:', ciudadano);
        if (ciudadano && ciudadano.idCiudadano) {
          this.auth.guardarDatosCiudadano(
            ciudadano.idCiudadano,
            ciudadano.nombreCompleto || 'Ciudadano',
          );
          this.nombreUsuario = this.auth.nombreCiudadano();
          this.cargarDatos();
        }
      },
      error: (err) => {
        console.log('Error obteniendo perfil en MisReportes, intentando carga directa:', err);
        this.cargarDatos();
      },
    });
  }

  cargarDatos(): void {
    const id = this.auth.idCiudadano();
    console.log('Consultando reportes y resumen para idCiudadano:', id);

    this.reporteService.obtenerResumenCiudadano(id).subscribe({
      next: (datos) => {
        console.log('Resumen recibido en MisReportes:', datos);
        if (datos) {
          this.resumen = datos;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.log('Error cargando resumen en MisReportes:', err),
    });

    this.reporteService.listarPorCiudadano(id).subscribe({
      next: (lista) => {
        console.log('Lista de reportes recibida:', lista);
        if (lista) {
          const listaOrdenada = lista.sort((a, b) => (b.idReporte || 0) - (a.idReporte || 0));
          this.reportesOriginales = listaOrdenada;
          this.reportesFiltrados = listaOrdenada;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.log('Error listando reportes:', err),
    });
  }

  aplicarFiltros(): void {
    console.log('Aplicando filtros:', {
      codigo: this.filtroCodigo,
      estado: this.filtroEstado,
      urgencia: this.filtroUrgencia,
      distrito: this.filtroDistrito,
    });

    const txtBuscar = this.filtroCodigo.toLowerCase().trim();

    this.reportesFiltrados = this.reportesOriginales.filter((r) => {
      const cod = `ha-00${r.idReporte}`.toLowerCase();
      const coincideCodigo = cod.includes(txtBuscar);
      const coincideEstado = this.filtroEstado === '' || r.estado === this.filtroEstado;
      const coincideUrgencia =
        this.filtroUrgencia === '' || r.nivelUrgencia === this.filtroUrgencia;
      const coincideDistrito =
        this.filtroDistrito === '' ||
        r.ubicacion?.distrito.toLowerCase() === this.filtroDistrito.toLowerCase();

      return coincideCodigo && coincideEstado && coincideUrgencia && coincideDistrito;
    });

    console.log('Reportes filtrados encontrados:', this.reportesFiltrados.length);
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    console.log('Click en Limpiar filtros');
    this.filtroCodigo = '';
    this.filtroEstado = '';
    this.filtroUrgencia = '';
    this.filtroDistrito = '';
    this.reportesFiltrados = [...this.reportesOriginales];
    this.cdr.detectChanges();
  }

  abrirMenu(): void {
    console.log('Click en abrir menú móvil (MisReportes)');
    this.menuMobileAbierto = true;
  }

  cerrarMenu(): void {
    console.log('Click en cerrar menú móvil (MisReportes)');
    this.menuMobileAbierto = false;
  }

  cerrarSesion(): void {
    console.log('Cerrando sesión desde MisReportes');
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
