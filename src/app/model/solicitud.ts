export class Solicitud {
  idSolicitud?: number;
  mascotaIdMascota!: number;
  ciudadanoIdCiudadano?: number;

  fechaSolicitud?: string;
  tipoVivienda!: string;
  motivo!: string;
  experiencia: boolean | null = null;
  estadoSolicitud?: string;
}
