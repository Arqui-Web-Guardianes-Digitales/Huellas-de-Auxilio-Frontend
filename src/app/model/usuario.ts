// Campos de UsuarioDTO del backend de Huellas de Auxilio.
export class Usuario {
  idUsuario?: number;
  idRol!: number;
  correo!: string;
  telefono!: string;
  contraseña!: string;
  estadoUsuario?: boolean;
}
