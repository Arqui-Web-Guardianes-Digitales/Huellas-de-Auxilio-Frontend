import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SolicitudesEntidadComponent } from './solicitudes-entidad-component';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { SolicitudService } from '../../services/solicitud-service';
import { Solicitud } from '../../model/solicitud';

describe('HU30: solicitudes por mascota', () => {
  let componente: SolicitudesEntidadComponent;
  let token: string;
  const listar = vi.fn();
  const listarEntidad = vi.fn();
  const datos: Solicitud[] = [
    { idSolicitud: 1, mascotaIdMascota: 7, estadoSolicitud: 'EN_REVISION', fechaSolicitud: '2026-11-17T10:00:00', tipoVivienda: 'Casa', motivo: 'Adoptar', experiencia: true },
    { idSolicitud: 2, mascotaIdMascota: 7, estadoSolicitud: 'RECHAZADA', fechaSolicitud: '2026-11-16T10:00:00', tipoVivienda: 'Casa', motivo: 'Adoptar', experiencia: false },
  ];
  beforeEach(() => {
    token = 'sesion'; listar.mockReset().mockReturnValue(of(datos));
    listarEntidad.mockReset().mockReturnValue(of(datos.map((s, i) => ({ ...s, especieMascota: i ? 'Perro' : 'Gato' }))));
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { token: () => token, roles: () => ['ROLE_ENTIDAD'], correoEntidad: () => 'entidad@prueba.local',
        idEntidad: () => 1, limpiarDatosEntidad: vi.fn(), guardarDatosEntidad: vi.fn(),
        obtenerPerfilEntidadDB: () => of({ idEntidad: 1, nombreEntidad: 'Entidad' }) } },
      { provide: MascotaService, useValue: { buscarPorId: () => of({ idMascota: 7, entidadIdEntidad: 1 }) } },
      { provide: SolicitudService, useValue: { listarPorMascota: listar, listarPorEntidad: listarEntidad } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ idMascota: '7' }) } } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
    ] });
    componente = TestBed.runInInjectionContext(() => new SolicitudesEntidadComponent());
  });
  it('consulta solo la mascota real y combina filtros sin repetir HTTP', () => {
    componente.ngOnInit();
    expect(listar).toHaveBeenCalledWith(7);
    componente.filtrosForm.patchValue({ codigo: 'SOL-1', estado: 'EN_REVISION' });
    expect(componente.solicitudesPagina.map(s => s.idSolicitud)).toEqual([1]);
    componente.filtrosForm.patchValue({ estado: 'APROBADA' });
    expect(componente.solicitudesPagina).toEqual([]);
    componente.limpiarFiltros();
    expect(componente.solicitudesPagina.length).toBe(2);
    expect(listar).toHaveBeenCalledOnce();
  });
  it('distingue una lista vacía de un error', () => {
    listar.mockReturnValue(of([])); componente.ngOnInit();
    expect(componente.error).toBe(''); expect(componente.cargando).toBe(false);
    listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    componente.ngOnInit();
    expect(componente.error).not.toBe(''); expect(componente.solicitudesPagina).toEqual([]);
  });
  it('rechaza registros de otra mascota', () => {
    listar.mockReturnValue(of([{ ...datos[0], mascotaIdMascota: 99 }]));
    componente.ngOnInit(); expect(componente.error).not.toBe('');
    expect(componente.solicitudesPagina).toEqual([]);
  });
  it('descarta respuestas antiguas al cambiar de sesión', () => {
    const respuesta = new Subject<Solicitud[]>(); listar.mockReturnValue(respuesta);
    componente.ngOnInit(); token = 'otra-sesion'; respuesta.next(datos);
    expect(componente.solicitudes).toEqual([]); expect(componente.mascota).toBeNull();
    expect(componente.error).not.toBe('');
  });
  it('HU31: consulta la entidad autenticada y combina especie, estado y código', () => {
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', { value: convertToParamMap({}) });
    componente = TestBed.runInInjectionContext(() => new SolicitudesEntidadComponent());
    componente.ngOnInit();
    expect(componente.general).toBe(true);
    expect(listarEntidad).toHaveBeenCalledWith(1);
    expect(listar).not.toHaveBeenCalled();
    componente.filtrosForm.patchValue({ codigo: '1', especie: 'gato', estado: 'EN_REVISION' });
    expect(componente.solicitudesPagina.map(s => s.idSolicitud)).toEqual([1]);
    componente.filtrosForm.patchValue({ especie: 'perro' });
    expect(componente.solicitudesPagina).toEqual([]);
    componente.limpiarFiltros();
    expect(componente.solicitudesPagina.length).toBe(2);
    expect(listarEntidad).toHaveBeenCalledOnce();
  });

});

