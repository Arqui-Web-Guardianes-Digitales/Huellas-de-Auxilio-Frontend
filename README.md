# Huellas de Auxilio – Base y autenticación (HU01–HU04)

Adaptación a Angular 22 + TypeScript de las páginas del prototipo proporcionado, usando los nombres y la estructura del proyecto `appproveedores` de clase.

## Carpetas y nomenclaturas
- `src/app/componentes/<pantalla>-component/`: tres archivos `<pantalla>-component.ts`, `.html`, `.css` (igual que `home-component` del profesor).
- `src/app/model/`: clases `Usuario`, `Ciudadano`, `Entidad`, `AuthResponse` (como `Proveedor` del profesor).
- `src/app/services/auth-service.ts`: login y registros con `HttpClient`.
- `src/app/services/registro-state-service.ts`: mantiene los datos temporales durante los dos pasos de registro.
- `src/app/app.routes.ts` y `app.config.ts`: rutas y proveedor HTTP.
- `src/environments/environment.ts`: `apiURL` de Spring Boot.
- `public/`: solo los recursos originales usados por estas páginas.

## Alcance
- Landing: `/`
- Login HU03: `/login`
- Elección de cuenta: `/crear-cuenta`
- Ciudadano HU01: `/registro-ciudadano`, `/confirmacion-ciudadano`, `/cuenta-registrada-ciudadano`
- Entidad HU02: `/registro-entidad`, `/confirmacion-entidad`, `/cuenta-registrada-entidad`
- Recuperación HU04: `/recuperar-cuenta`, `/nueva-contrasena`

## API utilizada
- POST `http://localhost:8088/api/usuario`
- POST `http://localhost:8088/api/ciudadano`
- POST `http://localhost:8088/api/entidad`
- POST `http://localhost:8088/api/authenticate`

Para registrarse, primero se crea `Usuario` y después `Ciudadano` o `Entidad` con el `idUsuario` devuelto.

**Limitaciones actuales del backend**: no hay una recuperación por correo con token verificable; por eso el formulario no afirma enviar un correo real. El login obtiene JWT y roles, pero no redirige a los paneles aún porque esas páginas pertenecen a otros integrantes. Al integrarlas, añadir las rutas de los paneles en `app.routes.ts` y cambiar los dos mensajes posteriores a login por `router.navigateByUrl(...)`.

## Incorporación al repositorio Angular vacío existente
1. Trabaja en tu propia rama Git (no en `main`).
2. Abre la carpeta del repositorio en Windows, conservando la carpeta `.git` original.
3. Copia **el contenido de este ZIP** en la raíz del repositorio; reemplaza los archivos de ejemplo del Angular vacío. No copies otra carpeta dentro del proyecto.
4. Ejecuta `npm install` y luego `npm start`.
5. Abre `http://localhost:4200`. Para usar la API de login y registro, inicia Spring Boot y PostgreSQL en el puerto `8088`.
6. Verifica con `npm run build` y con `git status`. Después haz commit y push en tu propia rama.

El ZIP no incluye `.git`, `node_modules`, `.angular`, `dist` ni archivos de backend.
