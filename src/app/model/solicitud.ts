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
  estadoSolicitud?: string;
}
