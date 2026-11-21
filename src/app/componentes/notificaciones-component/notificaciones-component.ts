import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

interface AvisoNotificacion {
  id: number;
  titulo: string;
  fecha: string;
  textoInicio: string;
  destacado: string;
  textoFinal: string;
  icono: string;
  color: 'azul' | 'verde' | 'morado' | 'naranja';
  ruta: (string | number)[];
  accion: string;
  leida: boolean;
}

@Component({
  selector: 'app-notificaciones-component',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './notificaciones-component.html',
  styleUrl: './notificaciones-component.css',
})
export class NotificacionesComponent {
  menuAbierto = false;
  mensaje = '';

  notificaciones: AvisoNotificacion[] = [
    {
      id: 1,
      titulo: 'Tu reporte HA-0241 cambió de estado',
      fecha: 'Hace 10 min',
      textoInicio: 'El reporte fue actualizado a',
      destacado: 'En revisión',
      textoFinal: '. La entidad está evaluando la evidencia enviada.',
      icono: '/icons/reloj-verde.png',
      color: 'azul',
      ruta: ['/seguimiento-reporte', 241],
      accion: 'Ver seguimiento',
      leida: false,
    },
    {
      id: 2,
      titulo: 'Reporte recibido por la entidad',
      fecha: 'Hoy, 08:55 a.m.',
      textoInicio: 'Tu reporte',
      destacado: 'HA-0241',
      textoFinal: 'fue recibido correctamente por Refugio Patitas.',
      icono: '/icons/check-relleno-verde.png',
      color: 'verde',
      ruta: ['/seguimiento-reporte', 241],
      accion: 'Ver detalle',
      leida: false,
    },
    {
      id: 3,
      titulo: 'Reporte derivado a una entidad cercana',
      fecha: 'Ayer, 06:20 p.m.',
      textoInicio: 'El caso',
      destacado: 'HA-0238',
      textoFinal: 'fue derivado a una entidad de apoyo cercana para su revisión.',
      icono: '/icons/ubicacion-verde.png',
      color: 'morado',
      ruta: ['/mis-reportes'],
      accion: 'Ver mis reportes',
      leida: true,
    },
    {
      id: 4,
      titulo: 'Reporte registrado correctamente',
      fecha: '12 may. 2026',
      textoInicio: 'Tu caso fue registrado con el código',
      destacado: 'HA-0241',
      textoFinal: '. Podrás revisar sus avances desde Mis reportes.',
      icono: '/icons/ticket-verde.png',
      color: 'naranja',
      ruta: ['/mis-reportes'],
      accion: 'Revisar reporte',
      leida: true,
    },
  ];

  get hayNoLeidas(): boolean {
    return this.notificaciones.some(notificacion => !notificacion.leida);
  }

  marcarTodasLeidas(): void {
    this.notificaciones = this.notificaciones.map(notificacion => ({
      ...notificacion,
      leida: true,
    }));
    this.mensaje = 'Todas las notificaciones están marcadas como leídas.';
  }

  abrirMenu(): void {
    this.menuAbierto = true;
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }
}
