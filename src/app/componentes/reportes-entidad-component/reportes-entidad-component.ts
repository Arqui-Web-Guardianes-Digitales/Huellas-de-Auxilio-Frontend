import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ReporteService } from '../../services/reporte-service';
import { Reporte } from '../../model/reporte';
import { MatPaginator, MatPaginatorIntl, PageEvent } from '@angular/material/paginator';

// Etiquetas locales: no cambiar el idioma de los componentes de otros integrantes.
function crearEtiquetasPaginador(): MatPaginatorIntl {
  const etiquetas = new MatPaginatorIntl();
  etiquetas.itemsPerPageLabel = 'Reportes por página:';
  etiquetas.nextPageLabel = 'Página siguiente';
  etiquetas.previousPageLabel = 'Página anterior';
  etiquetas.firstPageLabel = 'Primera página';
  etiquetas.lastPageLabel = 'Última página';
  etiquetas.getRangeLabel = (pagina, cantidad, total) => {
    if (!total) return '0 de 0 reportes';
    const inicio = pagina * cantidad + 1;
    const fin = Math.min(inicio + cantidad - 1, total);
    return `Página ${pagina + 1} · ${inicio}–${fin} de ${total} reportes`;
  };
  return etiquetas;
}

@Component({
  imports: [RouterLink, FormsModule, DatePipe, MatPaginator],
  providers: [{ provide: MatPaginatorIntl, useFactory: crearEtiquetasPaginador }],
  selector: 'app-reportes-entidad-component',
  styleUrl: './reportes-entidad-component.css',
  templateUrl: './reportes-entidad-component.html',
})
export class ReportesEntidadComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private tokenSesion: string | null = null;

  menuMobileAbierto = false;
  nombreEntidad = '';
  idEntidad: number | null = null;
  cargando = true;
  error = '';
  resumen: { recibidos: number; enRevision: number; atendidos: number; total: number } | null = null;
  reportesOriginales: Reporte[] = [];
  reportesFiltrados: Reporte[] = [];
  reportesPagina: Reporte[] = [];
  distritos: string[] = [];
  filtroCodigo = '';
  filtroEstado = '';
  filtroUrgencia = '';
  filtroDistrito = '';
  paginaActual = 1;
  porPagina = 6;

  ngOnInit(): void {
    this.tokenSesion = this.auth.token();
    const roles = this.auth.roles();
    if (!this.tokenSesion || !Array.isArray(roles) || !roles.includes('ROLE_ENTIDAD')) {
      this.cargando = false;
      void this.router.navigateByUrl('/login');
      return;
    }
    this.auth.limpiarDatosEntidad();
    if (!this.auth.correoEntidad()) {
      this.cargando = false;
      this.auth.cerrarSesion();
      void this.router.navigateByUrl('/login');
      return;
    }

    // Resolver el perfil también al entrar directamente o recargar la ruta.
    this.auth.obtenerPerfilEntidadDB().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entidad) => {
        if (!this.comprobarSesion()) return;
        if (!entidad) {
          this.cargando = false;
          this.error = 'No se encontró un perfil de entidad asociado a tu cuenta.';
          this.cdr.markForCheck();
          return;
        }
        this.idEntidad = entidad.idEntidad!;
        this.nombreEntidad = entidad.nombreEntidad.trim();
        this.auth.guardarDatosEntidad(this.idEntidad, this.nombreEntidad);
        this.cargarDatos();
      },
      error: (error: HttpErrorResponse | Error) => this.mostrarError(error),
    });
  }

  private cargarDatos(): void {
    if (!this.comprobarSesion()) return;
    const idEntidad = this.idEntidad;
    if (idEntidad === null || !Number.isSafeInteger(idEntidad) || idEntidad <= 0) {
      this.cargando = false;
      this.error = 'No se pudo identificar una entidad válida.';
      this.cdr.markForCheck();
      return;
    }

    this.reporteService.listarPorEntidad(idEntidad).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => {
        if (!this.comprobarSesion()) return;
        this.cargando = false;
        // No presentar una respuesta inválida o ajena como una lista vacía.
        if (!Array.isArray(lista) || lista.some((reporte) => !reporte
          || !Number.isSafeInteger(reporte.idReporte) || reporte.idReporte! <= 0
          || reporte.entidad?.idEntidad !== idEntidad
          || (reporte.fechaReporte && Number.isNaN(Date.parse(reporte.fechaReporte))))) {
          this.error = 'La API no devolvió un listado válido de reportes de tu entidad.';
          this.cdr.markForCheck();
          return;
        }
        this.reportesOriginales = [...lista].sort((a, b) => {
          const fechaA = Date.parse(a.fechaReporte || '');
          const fechaB = Date.parse(b.fechaReporte || '');
          return (Number.isNaN(fechaB) ? -Infinity : fechaB)
            - (Number.isNaN(fechaA) ? -Infinity : fechaA)
            || b.idReporte! - a.idReporte!;
        });
        this.resumen = {
          recibidos: lista.filter((reporte) => reporte.estado === 'R').length,
          enRevision: lista.filter((reporte) => reporte.estado === 'ER').length,
          atendidos: lista.filter((reporte) => reporte.estado === 'AT').length,
          total: lista.length,
        };
        this.distritos = [];
        for (const reporte of this.reportesOriginales) {
          const distrito = reporte.ubicacion?.distrito?.trim();
          if (distrito && !this.distritos.some((valor) => valor.toLowerCase() === distrito.toLowerCase())) {
            this.distritos.push(distrito);
          }
        }
        this.distritos.sort((a, b) => a.localeCompare(b));
        // Recuperar la selección al volver desde el detalle de un reporte.
        const parametros = this.route.snapshot.queryParamMap;
        this.filtroCodigo = parametros.get('codigo') || '';
        this.filtroEstado = parametros.get('estado') || '';
        this.filtroUrgencia = parametros.get('urgencia') || '';
        this.filtroDistrito = parametros.get('distrito') || '';
        this.porPagina = parametros.get('porPagina') === '12' ? 12 : 6;
        this.aplicarFiltros();
        const pagina = Number(parametros.get('pagina'));
        this.paginaActual = Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;
        this.actualizarPagina();
      },
      error: (error: HttpErrorResponse | Error) => this.mostrarError(error),
    });
  }

  aplicarFiltros(): void {
    if (!this.comprobarSesion()) return;
    const codigo = this.filtroCodigo.trim().toLowerCase();
    this.reportesFiltrados = this.reportesOriginales.filter((reporte) =>
      `ha-00${reporte.idReporte}`.includes(codigo)
      && (!this.filtroEstado || reporte.estado === this.filtroEstado)
      && (!this.filtroUrgencia || reporte.nivelUrgencia === this.filtroUrgencia)
      && (!this.filtroDistrito || reporte.ubicacion?.distrito?.trim().toLowerCase() === this.filtroDistrito.toLowerCase()),
    );
    this.paginaActual = 1;
    this.actualizarPagina();
  }

  limpiarFiltros(): void {
    this.filtroCodigo = '';
    this.filtroEstado = '';
    this.filtroUrgencia = '';
    this.filtroDistrito = '';
    this.aplicarFiltros();
  }

  cambiarPagina(evento: PageEvent): void {
    if (!this.comprobarSesion()) return;
    this.paginaActual = evento.pageIndex + 1;
    this.actualizarPagina();
  }

  cambiarPorPagina(): void {
    if (!this.comprobarSesion()) return;
    this.porPagina = this.porPagina === 12 ? 12 : 6;
    this.paginaActual = 1;
    this.actualizarPagina();
  }

  private actualizarPagina(): void {
    const total = this.reportesFiltrados.length;
    const ultimaPagina = Math.max(1, Math.ceil(total / this.porPagina));
    this.paginaActual = Math.max(1, Math.min(this.paginaActual, ultimaPagina));
    const desplazamiento = (this.paginaActual - 1) * this.porPagina;
    this.reportesPagina = this.reportesFiltrados.slice(desplazamiento, desplazamiento + this.porPagina);
    this.cdr.markForCheck();
  }

  private comprobarSesion(): boolean {
    const roles = this.auth.roles();
    if (this.tokenSesion && this.auth.token() === this.tokenSesion && this.auth.correoEntidad()
      && Array.isArray(roles) && roles.includes('ROLE_ENTIDAD')
      && (this.idEntidad === null || this.auth.idEntidad() === this.idEntidad)) return true;

    // Descartar datos antiguos sin cerrar una sesión nueva iniciada en paralelo.
    this.cargando = false;
    this.resumen = null;
    this.reportesOriginales = [];
    this.reportesFiltrados = [];
    this.reportesPagina = [];
    this.distritos = [];
    this.nombreEntidad = '';
    this.paginaActual = 1;
    this.error = 'La sesión cambió o caducó. Vuelve a iniciar sesión para consultar los reportes.';
    this.cdr.markForCheck();
    return false;
  }

  private mostrarError(error: HttpErrorResponse | Error): void {
    if (!this.comprobarSesion()) return;
    this.cargando = false;
    this.error = 'No se pudieron cargar los reportes de tu entidad. Intenta recargar la página.';
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.auth.cerrarSesion();
      void this.router.navigateByUrl('/login');
    }
    this.cdr.markForCheck();
  }

  abrirMenu(): void { this.menuMobileAbierto = true; }
  cerrarMenu(): void { this.menuMobileAbierto = false; }
}
