import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicarMascotaComponent } from './publicar-mascota-component';
import { AuthService } from '../../services/auth-service';
import { MascotaService } from '../../services/mascota-service';
import { ReporteService } from '../../services/reporte-service';
import { Mascota } from '../../model/mascota';

describe('HU29: edición de mascota', () => {
  let componente: PublicarMascotaComponent;
  let token: string;
  let mascota: Mascota;
  const editar = vi.fn();
  const subir = vi.fn();
  const navegar = vi.fn();
  beforeEach(() => {
    token = 'sesion-entidad';
    mascota = Object.assign(new Mascota(), { idMascota: 7, entidadIdEntidad: 1, nombre: 'Luna',
      edad: 'Adulto', especie: 'Gato', sexo: 'Hembra', distrito: 'San Miguel', tamaño: 'Pequeño',
      descripcion: 'Descripción real', urlFoto: 'http://localhost:8088/imagenes/existente.png', estado: true });
    editar.mockReset().mockImplementation((_id, datos) => of({ ...mascota, ...datos, idMascota: 7, entidadIdEntidad: 1, estado: true }));
    subir.mockReset(); navegar.mockReset();
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { token: () => token, roles: () => ['ROLE_ENTIDAD'],
        correoEntidad: () => 'entidad@prueba.local', idEntidad: () => 1,
        limpiarDatosEntidad: vi.fn(), guardarDatosEntidad: vi.fn(),
        obtenerPerfilEntidadDB: () => of({ idEntidad: 1, nombreEntidad: 'Entidad' }) } },
      { provide: MascotaService, useValue: { buscarPorId: () => of(mascota), editarMascota: editar,
        urlFotoMascota: (url: string) => url } },
      { provide: ReporteService, useValue: { subirImagen: subir } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ idMascota: '7' }) } } },
      { provide: Router, useValue: { navigateByUrl: navegar } },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
    ] });
    componente = TestBed.runInInjectionContext(() => new PublicarMascotaComponent());
    componente.ngOnInit();
  });
  it('carga con patchValue y conserva edad categórica y fotografía sin subir otra', () => {
    expect(componente.mascotaForm.value.nombre).toBe('Luna');
    expect(componente.mascotaForm.value.edad).toBeNull();
    componente.publicar();
    expect(editar).toHaveBeenCalledOnce();
    expect(editar.mock.calls[0][1].edad).toBe('Adulto');
    expect(editar.mock.calls[0][1].urlFoto).toBe(mascota.urlFoto);
    expect(editar.mock.calls[0][1].estado).toBeUndefined();
    expect(subir).not.toHaveBeenCalled();
    expect(componente.mascotaPublicada?.idMascota).toBe(7);
  });
  it('permite registrar edad exacta sin inventarla y continuar editando', () => {
    componente.mascotaForm.patchValue({ edad: 2, unidadEdad: 'años' });
    componente.publicar();
    expect(editar.mock.calls[0][1].edad).toBe('2 años');
    componente.seguirEditando();
    expect(componente.mascotaPublicada).toBeNull();
    expect(componente.mascotaForm.value.edad).toBe(2);
  });
  it('no guarda campos inválidos ni una fotografía ausente', () => {
    componente.mascotaForm.patchValue({ nombre: '  ' });
    componente.publicar();
    expect(editar).not.toHaveBeenCalled();
    expect(componente.campoInvalido('nombre')).toBe(true);
  });
  it('bloquea peticiones duplicadas y cancela sin guardar', () => {
    componente.cancelar();
    expect(navegar).toHaveBeenCalledWith('/adopciones-entidad');
    expect(editar).not.toHaveBeenCalled();
    editar.mockReturnValue(new Subject());
    componente.publicar(); componente.publicar();
    expect(editar).toHaveBeenCalledOnce();
    expect(componente.guardando).toBe(true);
  });
  it('descarta los datos si cambia la sesión', () => {
    token = 'otra-sesion';
    componente.publicar();
    expect(editar).not.toHaveBeenCalled();
    expect(componente.errorSesion).not.toBe('');
    expect(componente.vistaPrevia).toBe('');
  });
  it('rechaza una mascota de otra entidad antes de habilitar el formulario', () => {
    mascota.entidadIdEntidad = 2;
    componente = TestBed.runInInjectionContext(() => new PublicarMascotaComponent());
    componente.ngOnInit(); componente.publicar();
    expect(componente.errorSesion).not.toBe(''); expect(editar).not.toHaveBeenCalled();
  });
  it('reemplazar la foto sube una sola imagen y utiliza la URL devuelta', () => {
    const crear = vi.fn(() => 'blob:prueba');
    vi.stubGlobal('Image', class {
      onload?: () => void;
      set src(_url: string) { this.onload?.(); }
    });
    const anteriorCrear = URL.createObjectURL;
    const anteriorRevocar = URL.revokeObjectURL;
    URL.createObjectURL = crear; URL.revokeObjectURL = vi.fn();
    try {
      const foto = new File(['contenido'], 'nueva.png', { type: 'image/png' });
      componente.seleccionarFoto({ target: { files: { item: () => foto, length: 1 }, value: '' } } as unknown as Event);
      subir.mockReturnValue(of({ url: 'http://localhost:8088/imagenes/nueva.png' }));
      componente.publicar();
      expect(subir).toHaveBeenCalledWith(foto);
      expect(editar.mock.calls[0][1].urlFoto).toBe('http://localhost:8088/imagenes/nueva.png');
    } finally {
      URL.createObjectURL = anteriorCrear; URL.revokeObjectURL = anteriorRevocar;
      vi.unstubAllGlobals();
    }
  });
  it('HU28 conserva el modo publicación y restablece todos los campos', () => {
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', { value: convertToParamMap({}) });
    componente = TestBed.runInInjectionContext(() => new PublicarMascotaComponent()); componente.ngOnInit();
    expect(componente.edicion).toBe(false);
    componente.mascotaForm.patchValue({ nombre: 'Otra', edad: 2, unidadEdad: 'años', foto: 'anterior' });
    componente.error = 'Mensaje anterior'; componente.errorFoto = 'Error anterior';
    componente.publicarOtra();
    expect(componente.mascotaForm.value).toEqual({ nombre: '', especie: '', edad: null, unidadEdad: 'meses', sexo: '', distrito: '', tamaño: '', descripcion: '', foto: '' });
    expect(componente.vistaPrevia).toBe(''); expect(componente.error).toBe(''); expect(componente.errorFoto).toBe('');
    expect(componente.mascotaForm.untouched).toBe(true);
  });

});

