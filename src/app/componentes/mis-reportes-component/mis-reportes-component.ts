import { Component, OnInit, inject } from '@angular/core';
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

  menuMobileAbierto: boolean = false;
  nombreUsuario: string = 'Ciudadano';

  resumen: ResumenReportes = { total: 0, enRevision: 0, atendidos: 0 };

  // Listas de datos
  reportesOriginales: Reporte[] = [];
  reportesFiltrados: Reporte[] = [];

  // Variables para filtros (ngModel)
  filtroCodigo: string = '';
  filtroEstado: string = '';
  filtroUrgencia: string = '';
  filtroDistrito: string = '';

  ngOnInit(): void {
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.nombreUsuario = this.auth.nombreCiudadano();
    this.cargarDatos();
  }

  cargarDatos(): void {
    const id = this.auth.idCiudadano();

    // Cargar tarjetas superiores
    this.reporteService.obtenerResumenCiudadano(id).subscribe({
      next: (datos) => {
        if (datos) this.resumen = datos;
      },
    });

    // Cargar tabla (solo reportes de ESTE usuario)
    this.reporteService.listarPorCiudadano(id).subscribe({
      next: (lista) => {
        if (lista) {
          this.reportesOriginales = lista;
          this.reportesFiltrados = lista;
        }
      },
    });
  }

  aplicarFiltros(): void {
    const txtBuscar = this.filtroCodigo.toLowerCase().trim();

    this.reportesFiltrados = this.reportesOriginales.filter((r) => {
      // 1. Filtro Código
      const cod = `ha-00${r.idReporte}`.toLowerCase();
      const coincideCodigo = cod.includes(txtBuscar);

      // 2. Filtro Estado
      const coincideEstado = this.filtroEstado === '' || r.estado === this.filtroEstado;

      // 3. Filtro Urgencia
      const coincideUrgencia =
        this.filtroUrgencia === '' || r.nivelUrgencia === this.filtroUrgencia;

      // 4. Filtro Distrito
      const coincideDistrito =
        this.filtroDistrito === '' ||
        r.ubicacion?.distrito.toLowerCase() === this.filtroDistrito.toLowerCase();

      return coincideCodigo && coincideEstado && coincideUrgencia && coincideDistrito;
    });
  }

  limpiarFiltros(): void {
    this.filtroCodigo = '';
    this.filtroEstado = '';
    this.filtroUrgencia = '';
    this.filtroDistrito = '';
    this.reportesFiltrados = [...this.reportesOriginales];
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
