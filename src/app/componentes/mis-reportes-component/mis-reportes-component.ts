import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef, ViewChild, } from '@angular/core';import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Reporte, ResumenReportes } from '../../model/reporte';

@Component({
  selector: 'app-mis-reportes-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  templateUrl: './mis-reportes-component.html',
  styleUrl: './mis-reportes-component.css',
})
export class MisReportesComponent implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  displayedColumns: string[] = [
    'idReporte',
    'distrito',
    'nivelUrgencia',
    'estado',
    'fechaReporte',
    'accion',
  ];

  dataSource: MatTableDataSource<Reporte> = new MatTableDataSource<Reporte>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  menuMobileAbierto: boolean = false;
  nombreUsuario: string = 'Ciudadano';

  resumen: ResumenReportes = { total: 0, enRevision: 0, atendidos: 0 };

  filtroCodigo: string = '';
  filtroEstado: string = '';
  filtroUrgencia: string = '';
  filtroDistrito: string = '';

  ngOnInit(): void {
    console.log('ngOnInit de MisReportesComponent (Angular Material)');
    if (!this.auth.token() || !this.auth.roles().includes('ROLE_CIUDADANO')) {
      console.log('Sesión no válida en MisReportes, redirigiendo a /login');
      this.router.navigateByUrl('/login');
      return;
    }

    // Configurar ordenamiento para propiedades anidadas (ubicacion.distrito)
    this.dataSource.sortingDataAccessor = (item: Reporte, property: string) => {
      switch (property) {
        case 'distrito':
          return item.ubicacion?.distrito?.toLowerCase() || '';
        case 'idReporte':
          return item.idReporte || 0;
        default:
          return (item as any)[property] || '';
      }
    };

    // Configurar filtro combinado para los 4 campos
    this.dataSource.filterPredicate = (data: Reporte, filter: string) => {
      const f = JSON.parse(filter);
      const cod = `ha-00${data.idReporte}`.toLowerCase();
      const coincideCodigo = cod.includes(f.codigo);
      const coincideEstado = f.estado === '' || data.estado === f.estado;
      const coincideUrgencia = f.urgencia === '' || data.nivelUrgencia === f.urgencia;
      const coincideDistrito =
        f.distrito === '' ||
        (data.ubicacion?.distrito || '').toLowerCase() === f.distrito.toLowerCase();

      return coincideCodigo && coincideEstado && coincideUrgencia && coincideDistrito;
    };

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

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
          const listaOrdenada = [...lista].sort((a, b) => (b.idReporte || 0) - (a.idReporte || 0));
          this.dataSource.data = listaOrdenada;
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.log('Error listando reportes:', err),
    });
  }

  aplicarFiltros(): void {
    const filtros = {
      codigo: this.filtroCodigo.toLowerCase().trim(),
      estado: this.filtroEstado,
      urgencia: this.filtroUrgencia,
      distrito: this.filtroDistrito,
    };
    console.log('Aplicando filtros en MatTableDataSource:', filtros);

    this.dataSource.filter = JSON.stringify(filtros);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    console.log('Reportes filtrados encontrados:', this.dataSource.filteredData.length);
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    console.log('Click en Limpiar filtros');
    this.filtroCodigo = '';
    this.filtroEstado = '';
    this.filtroUrgencia = '';
    this.filtroDistrito = '';
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    this.cdr.detectChanges();
  }

  logVerDetalle(idReporte?: number): void {
    console.log('Click en Ver detalle del reporte:', idReporte);
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
