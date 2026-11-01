// Campos de CiudadanoDTO del backend.
export class Ciudadano {
  idCiudadano?: number;
  dni!: string;
  distrito!: string;
  nombreCompleto?: string;
  idUsuario!: number;
}

// Datos del primer paso del formulario del prototipo.
export interface DatosCiudadano {
  dni: string;
  correo: string;
  distrito: string;
  telefono: string;
}
