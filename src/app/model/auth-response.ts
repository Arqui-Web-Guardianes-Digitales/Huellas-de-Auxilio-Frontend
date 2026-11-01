// Respuesta real de POST /api/authenticate.
export class AuthResponse {
  jwt!: string;
  roles!: string[];
}
