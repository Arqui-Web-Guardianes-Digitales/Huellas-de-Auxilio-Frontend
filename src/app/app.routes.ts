import { Routes } from '@angular/router';
import {HomeCiudadanoComponent} from './componentes/home-ciudadano-component/home-ciudadano-component';
import {HomeEntidadComponent} from './componentes/home-entidad-component/home-entidad-component';
import {ConfirmacionCiudadanoComponent} from './componentes/confirmacion-ciudadano-component/confirmacion-ciudadano-component';
import {ConfirmacionEntidadComponent} from './componentes/confirmacion-entidad-component/confirmacion-entidad-component';
import {CrearCuentaComponent} from './componentes/crear-cuenta-component/crear-cuenta-component';
import {CuentaRegistradaCiudadanoComponent} from './componentes/cuenta-registrada-ciudadano-component/cuenta-registrada-ciudadano-component';
import {CuentaRegistradaEntidadComponent} from './componentes/cuenta-registrada-entidad-component/cuenta-registrada-entidad-component';
import {LandingComponent} from './componentes/landing-component/landing-component';
import {LoginComponent} from './componentes/login-component/login-component';
import {NuevaContrasenaComponent} from './componentes/nueva-contrasena-component/nueva-contrasena-component';
import {RecuperarCuentaComponent} from './componentes/recuperar-cuenta-component/recuperar-cuenta-component';
import {RegistroCiudadanoComponent} from './componentes/registro-ciudadano-component/registro-ciudadano-component';
import { RegistroEntidadComponent } from './componentes/registro-entidad-component/registro-entidad-component';
import { AdopcionesComponent } from './componentes/adopciones-component/adopciones-component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'home-ciudadano', component: HomeCiudadanoComponent },
  { path: 'home-entidad', component: HomeEntidadComponent },
  { path: 'crear-cuenta', component: CrearCuentaComponent },
  { path: 'registro-ciudadano', component: RegistroCiudadanoComponent },
  { path: 'registro-entidad', component: RegistroEntidadComponent },
  { path: 'confirmacion-ciudadano', component: ConfirmacionCiudadanoComponent },
  { path: 'confirmacion-entidad', component: ConfirmacionEntidadComponent },
  { path: 'cuenta-registrada-ciudadano', component: CuentaRegistradaCiudadanoComponent },
  { path: 'cuenta-registrada-entidad', component: CuentaRegistradaEntidadComponent },
  { path: 'recuperar-cuenta', component: RecuperarCuentaComponent },
  { path: 'nueva-contrasena', component: NuevaContrasenaComponent },
  { path: 'adopciones', component: AdopcionesComponent },
  { path: '**', component: LandingComponent }
];
