import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { ForbiddenComponent } from './componentes/forbidden-component/forbidden-component';
import { LandingComponent } from './componentes/landing-component/landing-component';
import { LoginComponent } from './componentes/login-component/login-component';
import { CrearCuentaComponent } from './componentes/crear-cuenta-component/crear-cuenta-component';
import { RegistroCiudadanoComponent } from './componentes/registro-ciudadano-component/registro-ciudadano-component';
import { RegistroEntidadComponent } from './componentes/registro-entidad-component/registro-entidad-component';
import { ConfirmacionCiudadanoComponent } from './componentes/confirmacion-ciudadano-component/confirmacion-ciudadano-component';
import { ConfirmacionEntidadComponent } from './componentes/confirmacion-entidad-component/confirmacion-entidad-component';
import { CuentaRegistradaCiudadanoComponent } from './componentes/cuenta-registrada-ciudadano-component/cuenta-registrada-ciudadano-component';
import { CuentaRegistradaEntidadComponent } from './componentes/cuenta-registrada-entidad-component/cuenta-registrada-entidad-component';
import { RecuperarCuentaComponent } from './componentes/recuperar-cuenta-component/recuperar-cuenta-component';
import { NuevaContrasenaComponent } from './componentes/nueva-contrasena-component/nueva-contrasena-component';
import { HomeCiudadanoComponent } from './componentes/home-ciudadano-component/home-ciudadano-component';
import { HomeEntidadComponent } from './componentes/home-entidad-component/home-entidad-component';
import { MisReportesComponent } from './componentes/mis-reportes-component/mis-reportes-component';
import { ReportarComponent } from './componentes/reportar-component/reportar-component';
import { SeguimientoReporteComponent } from './componentes/seguimiento-reporte-component/seguimiento-reporte-component';
import { DirectorioComponent } from './componentes/directorio-component/directorio-component';
import { DetalleEntidadComponent } from './componentes/detalle-entidad-component/detalle-entidad-component';
import { AdopcionesComponent } from './componentes/adopciones-component/adopciones-component';
import { AyudaComponent } from './componentes/ayuda-component/ayuda-component';
import { NotificacionesComponent } from './componentes/notificaciones-component/notificaciones-component';
import { MiCuentaCiudadanoComponent } from './componentes/mi-cuenta-ciudadano-component/mi-cuenta-ciudadano-component';
import { DetalleMascotaComponent } from './componentes/detalle-mascota-component/detalle-mascota-component';
import { SolicitudAdopcionComponent } from './componentes/solicitud-adopcion-component/solicitud-adopcion-component';
import { MisSolicitudesComponent } from './componentes/mis-solicitudes-component/mis-solicitudes-component';
import { DetalleSolicitudComponent } from './componentes/detalle-solicitud-component/detalle-solicitud-component';
import { GuiaAyudaComponent } from './componentes/guia-ayuda-component/guia-ayuda-component';

export const routes: Routes = [
  { path: '', component: LandingComponent },

  // Auth y Registro
  { path: 'login', component: LoginComponent },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: 'crear-cuenta', component: CrearCuentaComponent },
  { path: 'registro-ciudadano', component: RegistroCiudadanoComponent },
  { path: 'registro-entidad', component: RegistroEntidadComponent },
  { path: 'confirmacion-ciudadano', component: ConfirmacionCiudadanoComponent },
  { path: 'confirmacion-entidad', component: ConfirmacionEntidadComponent },
  { path: 'cuenta-registrada-ciudadano', component: CuentaRegistradaCiudadanoComponent },
  { path: 'cuenta-registrada-entidad', component: CuentaRegistradaEntidadComponent },
  { path: 'recuperar-cuenta', component: RecuperarCuentaComponent },
  { path: 'nueva-contrasena', component: NuevaContrasenaComponent },

  // Flujo Ciudadano
  { path: 'home-ciudadano', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: HomeCiudadanoComponent },
  { path: 'mis-reportes', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: MisReportesComponent },
  { path: 'reportar', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: ReportarComponent },
  { path: 'seguimiento-reporte/:id', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: SeguimientoReporteComponent },
  { path: 'seguimiento-reporte', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: SeguimientoReporteComponent },
  { path: 'directorio', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: DirectorioComponent },
  { path: 'detalle-entidad/:idEntidad', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: DetalleEntidadComponent },
  { path: 'adopciones', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: AdopcionesComponent },
  { path: 'ayuda', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO', 'ROLE_ENTIDAD'] }, component: AyudaComponent },
  { path: 'notificaciones', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO', 'ROLE_ENTIDAD'] }, component: NotificacionesComponent },
  { path: 'mi-cuenta-ciudadano', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: MiCuentaCiudadanoComponent },
  { path: 'guia-ayuda', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO', 'ROLE_ENTIDAD'] }, component: GuiaAyudaComponent },
  { path: 'detalle-mascota/:idMascota', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: DetalleMascotaComponent },
  { path: 'solicitud-adopcion/:idMascota', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: SolicitudAdopcionComponent },

  //Flujo Solicitud
  { path: 'mis-solicitudes', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: MisSolicitudesComponent },
  { path: 'detalle-solicitud/:idSolicitud', canActivate: [AuthGuard], data: { roles: ['ROLE_CIUDADANO'] }, component: DetalleSolicitudComponent },

  // Flujo Entidad
  { path: 'home-entidad', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] }, component: HomeEntidadComponent },
  {
    path: 'mi-cuenta-entidad', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () =>
      import('./componentes/mi-cuenta-entidad-component/mi-cuenta-entidad-component').then(
        (componente) => componente.MiCuentaEntidadComponent,
      ),
  },
  {
    path: 'reportes-entidad', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () =>
      import('./componentes/reportes-entidad-component/reportes-entidad-component').then(
        (componente) => componente.ReportesEntidadComponent,
      ),
  },

  {
    path: 'detalle-reporte-entidad/:id', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () =>
      import('./componentes/detalle-reporte-entidad-component/detalle-reporte-entidad-component').then(
        (componente) => componente.DetalleReporteEntidadComponent,
      ),
  },

  {
    path: 'adopciones-entidad', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () =>
      import('./componentes/adopciones-entidad-component/adopciones-entidad-component').then(
        (componente) => componente.AdopcionesEntidadComponent,
      ),
  },

  {
    path: 'publicar-mascota', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () => import('./componentes/publicar-mascota-component/publicar-mascota-component')
      .then((componente) => componente.PublicarMascotaComponent),
  },

  {
    path: 'editar-mascota/:idMascota', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () => import('./componentes/publicar-mascota-component/publicar-mascota-component')
      .then((componente) => componente.PublicarMascotaComponent),
  },

  {
    path: 'solicitudes-mascota/:idMascota',
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () =>
      import('./componentes/solicitudes-entidad-component/solicitudes-entidad-component')
        .then((componente) => componente.SolicitudesEntidadComponent),
  },

  {
    path: 'solicitudes-entidad', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () => import('./componentes/solicitudes-entidad-component/solicitudes-entidad-component')
      .then((componente) => componente.SolicitudesEntidadComponent),
  },

  {
    path: 'detalle-solicitud-entidad/:idMascota/:idSolicitud', canActivate: [AuthGuard], data: { roles: ['ROLE_ENTIDAD'] },
    loadComponent: () => import('./componentes/detalle-solicitud-entidad-component/detalle-solicitud-entidad-component')
      .then((componente) => componente.DetalleSolicitudEntidadComponent),
  },

  // Comodín para redirigir si no existe la ruta
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
