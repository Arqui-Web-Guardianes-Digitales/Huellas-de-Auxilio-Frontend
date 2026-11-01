import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-adopciones-component',
  templateUrl: './adopciones-component.html',
  styleUrls: ['./adopciones-component.css', './HE_Header_Ciudadano.css', './HE_Menu_Ciudadano.css'],
})
export class AdopcionesComponent {
  menuAbierto: boolean = false;
}
