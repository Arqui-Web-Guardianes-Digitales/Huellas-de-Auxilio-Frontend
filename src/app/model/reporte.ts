import { Ciudadano } from './ciudadano';
import { Entidad } from './entidad';

export class Ubicacion {
  idUbicacion?: number;
  direccion!: string;
  distrito!: string;
  referencia?: string;
  latitud!: number;
  longitud!: number;
}
export class Reporte {
  idReporte?: number;
  fechaReporte?: string;
  tipoCaso!: string;
  nivelUrgencia!: string;
  descripcion!: string;
  estado!: string; // 'R': Recibido, 'ER': En Revisión, 'AT': Atendido
  ubicacion?: Ubicacion;
  ciudadano?: Ciudadano;
  entidad?: Entidad;
}

export interface ResumenReportes {
  total: number;
  enRevision: number;
  atendidos: number;
}
