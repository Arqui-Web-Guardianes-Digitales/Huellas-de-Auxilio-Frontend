export interface Notificacion {
  idNotificacion: number;
  titulo: string;
  descripcion: string;
  estadoNotificacion: boolean;
  fechaNotificacion: string | null;
  reporteIdReporte: number | null;
  solicitudIdSolicitud: number | null;
  usuarioIdUsuario: number | null;
}

export interface SesionNotificaciones {
  idUsuario: number;
  idPerfil: number;
  rol: 'CIUDADANO' | 'ENTIDAD';
  nombre: string;
}
