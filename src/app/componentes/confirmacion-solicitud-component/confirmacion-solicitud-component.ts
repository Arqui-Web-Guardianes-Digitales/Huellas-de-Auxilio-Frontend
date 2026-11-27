import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-confirmacion-solicitud-component',
  styleUrl: './confirmacion-solicitud-component.css',
  templateUrl: './confirmacion-solicitud-component.html',
})
export class ConfirmacionSolicitudComponent implements OnInit, OnDestroy {
  ngOnInit(): void {
    console.log('[ConfirmacionSolicitudComponent] Entrada al componente.');
  }

  ngOnDestroy(): void {
    console.log('[ConfirmacionSolicitudComponent] Salida del componente.');
  }
}
