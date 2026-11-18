import {Component, HostListener} from '@angular/core';
import {RouterLink} from '@angular/router';
@Component({selector:'app-landing-component',imports:[RouterLink],templateUrl:'./landing-component.html',styleUrl:'./landing-component.css'})
export class LandingComponent {
  mostrarVolver = false;
  @HostListener('window:scroll') onScroll(): void {
    this.mostrarVolver = window.scrollY > 650;
  }
  subir():void {window.scrollTo({top:0,behavior:'smooth'});}
}
