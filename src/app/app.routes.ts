import { Routes } from '@angular/router';
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
import { AdopcionesComponent } from './componentes/adopciones-component/adopciones-component';
import { AyudaComponent } from './componentes/ayuda-component/ayuda-component';
import { NotificacionesComponent } from './componentes/notificaciones-component/notificaciones-component';
import { MiCuentaCiudadanoComponent } from './componentes/mi-cuenta-ciudadano-component/mi-cuenta-ciudadano-component';
import { GuiaAyudaComponent } from './componentes/guia-ayuda-component/guia-ayuda-component';

export const routes: Routes = [
  { path: '', component: LandingComponent },

  // Auth y Registro
  { path: 'login', component: LoginComponent },
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
  { path: 'home-ciudadano', component: HomeCiudadanoComponent },
  { path: 'mis-reportes', component: MisReportesComponent },
  { path: 'reportar', component: ReportarComponent },
  { path: 'seguimiento-reporte/:id', component: SeguimientoReporteComponent },
  { path: 'seguimiento-reporte', component: SeguimientoReporteComponent },
  { path: 'directorio', component: DirectorioComponent },
  { path: 'adopciones', component: AdopcionesComponent },
  { path: 'ayuda', component: AyudaComponent },
  { path: 'notificaciones', component: NotificacionesComponent },
  { path: 'mi-cuenta-ciudadano', component: MiCuentaCiudadanoComponent },
  { path: 'guia-ayuda', component: GuiaAyudaComponent },

  // Flujo Entidad
  { path: 'home-entidad', component: HomeEntidadComponent },

  // Comodín para redirigir si no existe la ruta
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
