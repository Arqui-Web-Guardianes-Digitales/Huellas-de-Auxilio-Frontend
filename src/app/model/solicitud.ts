export class Solicitud {
  nombreSolicitante?: string;
  distritoSolicitante?: string;
  especieMascota?: string;
  dniSolicitante?: string;
  correoSolicitante?: string;
  telefonoSolicitante?: string;
  idSolicitud?: number;
  mascotaIdMascota!: number;
  ciudadanoIdCiudadano?: number;

  fechaSolicitud?: string;
  tipoVivienda!: string;
  motivo!: string;
  experiencia: boolean | null = null;
  // Se envía al registrar para validar la aceptación; no es una columna de la solicitud.
  aceptoTerminos?: boolean;
  estadoSolicitud?: string;
}
