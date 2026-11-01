// Campos obligatorios de EntidadDTO del backend.
export class Entidad {
  idEntidad?: number;
  nombreEntidad!: string;
  tipoEntidad!: string;
  zonaAtencion!: string;
  idUsuario!: number;
}

// Datos del primer paso del formulario del prototipo.
export interface DatosEntidad {
  nombreEntidad: string;
  tipoEntidad: string;
  correo: string;
  zonaAtencion: string;
  telefono: string;
}
