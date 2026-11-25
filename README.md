# Huellas de Auxilio — Frontend (Angular 22)

Proyecto completo de Huellas de Auxilio, con pantallas Ciudadano/Entidad y autenticación JWT.

## Estructura

- `src/app/componentes/`: componentes y vistas existentes (se conservan sus nombres).
- `src/app/model/`: modelos que utiliza el frontend.
- `src/app/services/`: servicios de autenticación, ciudadanos, entidades, mascotas, solicitudes, reportes y notificaciones.
- `src/app/guards/auth-guard.ts`: protege rutas y comprueba los roles `ROLE_CIUDADANO` y `ROLE_ENTIDAD`.
- `src/app/interceptor/login-interceptor.ts`: añade `Authorization: Bearer <token>` a las solicitudes autenticadas dirigidas a la API y gestiona respuestas 401/403.
- `src/app/app.routes.ts`: rutas públicas y rutas privadas de Ciudadano y Entidad.
- `src/environments/environment.ts`: URL del backend de desarrollo (`http://localhost:8088/api`).

## Iniciar el proyecto

Requisitos: Node.js compatible con Angular 22 y npm; backend de Huellas de Auxilio con PostgreSQL ejecutándose en `http://localhost:8088`.

```powershell
npm ci
npm start
```

Abrir `http://localhost:4200`.

Para compilar:

```powershell
npm run build
```

Los formularios de registro (`/registro-ciudadano`, `/registro-entidad`) y el login (`/login`) son públicos. El resto de pantallas internas requiere un JWT válido; Angular redirige a `/login` cuando no hay sesión y a `/forbidden` cuando el rol no corresponde.

## Integrar a tu rama Git

Este ZIP está preparado para reemplazar **el contenido del frontend**; no incluye `.git`, `node_modules`, `.angular` ni `dist`. No reemplaces ni elimines la carpeta `.git` de tu repositorio local.

1. Guarda una copia de tu frontend actual y confirma que estás en tu rama (`git branch --show-current`).
2. Extrae el proyecto y copia sus archivos y carpetas a la raíz del frontend del repositorio, reemplazando los existentes; conserva la carpeta `.git` original.
3. Si antes tenías archivos extra, comprueba si forman parte de tu rama antes de eliminarlos (`git status`).
4. Ejecuta `npm ci`, `npm start` y `npm run build` en tu equipo.
5. Prueba login de un Ciudadano y una Entidad, navegación a páginas privadas, salida y acceso a rutas sin sesión.
6. `git add .`, `git commit -m "Corregir frontend e integrar seguridad JWT"`, `git push -u origin <nombre-de-tu-rama>`.

No se requiere volver a reemplazar el backend que ya funciona. El backend debe exponer la cabecera de respuesta `Authorization` para el login, tal como se configuró en Security.

**Validación de este paquete:** los modelos, servicios, rutas y plantillas pasaron el compilador de Angular (`ngc`). La ejecución integrada contra el backend y el build con el bundler se comprueban en el equipo con dependencias propias de Windows.
