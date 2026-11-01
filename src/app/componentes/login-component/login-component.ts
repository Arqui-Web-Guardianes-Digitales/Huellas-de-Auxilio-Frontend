import {ChangeDetectorRef,Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '../../services/auth-service';
@Component({selector:'app-login-component',imports:[FormsModule,RouterLink],templateUrl:'./login-component.html',styleUrl:'./login-component.css'})
export class LoginComponent {
  private readonly auth=inject(AuthService);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly router=inject(Router);
  correo='';contrasena='';error='';cargando=false;
  submit():void {
    this.error='';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo) || !this.contrasena) {
      this.error='Ingresa tu correo y contraseña válidos.';return;
    }
    this.cargando=true;
    this.auth.login(this.correo.trim().toLowerCase(),this.contrasena).subscribe({
      next:r=>{
        this.cargando=false;
        if (!r?.jwt || !r.roles?.length) {
          this.error='La API no devolvió un token y un rol válidos.';
          this.cdr.markForCheck();
          return;
        }
        if(r.roles.includes('ROLE_CIUDADANO')) {
          this.auth.iniciarSesion(r);
          this.router.navigateByUrl('/home-ciudadano');
        } else if(r.roles.includes('ROLE_ENTIDAD')) {
          this.auth.iniciarSesion(r);
          this.router.navigateByUrl('/home-entidad');
        } else this.error='Tu usuario no tiene un perfil reconocido.';
        // Mantener la actualización de mensajes de error en Angular 22.
        this.cdr.markForCheck();
      },
      error:(e:HttpErrorResponse)=>{
        this.cargando=false;
        this.error=e.status===0?'No se pudo conectar con el servidor de Huellas de Auxilio.':'Correo o contraseña incorrectos.';
        this.cdr.markForCheck();
      }
    });
  }
}
