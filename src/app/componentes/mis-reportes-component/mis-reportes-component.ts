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
  private readonly cdr = inject(ChangeDetectorRef); // <-- Arregla el bug visual

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
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Obtenemos el perfil real antes de cargar la tabla
    this.auth.obtenerPerfilCiudadanoDB().subscribe({
      next: (ciudadano) => {
        if (ciudadano && ciudadano.idCiudadano) {
          this.auth.guardarDatosCiudadano(
            ciudadano.idCiudadano,
            ciudadano.nombreCompleto || 'Ciudadano',
          );
          this.nombreUsuario = this.auth.nombreCiudadano();
          this.cargarDatos();
        }
      },
      error: () => this.cargarDatos(),
    });
  }

  cargarDatos(): void {
    const id = this.auth.idCiudadano();

    this.reporteService.obtenerResumenCiudadano(id).subscribe({
      next: (datos) => {
        if (datos) {
          this.resumen = datos;
          this.cdr.detectChanges(); // <-- Obligamos a pintar
        }
      },
    });

    this.reporteService.listarPorCiudadano(id).subscribe({
      next: (lista) => {
        if (lista) {
          this.reportesOriginales = lista;
          this.reportesFiltrados = lista;
          this.cdr.detectChanges(); // <-- Obligamos a pintar
        }
      },
    });
  }

  aplicarFiltros(): void {
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

    this.cdr.detectChanges(); // <-- Obligamos a pintar al filtrar
  }

  limpiarFiltros(): void {
    this.filtroCodigo = '';
    this.filtroEstado = '';
    this.filtroUrgencia = '';
    this.filtroDistrito = '';
    this.reportesFiltrados = [...this.reportesOriginales];
    this.cdr.detectChanges(); // <-- Obligamos a pintar al limpiar
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
