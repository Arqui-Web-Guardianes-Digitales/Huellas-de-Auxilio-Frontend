import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Route, Router } from '@angular/router';

type VistaAyuda = 'centro' | 'chat' | 'guia';
type Destino = 'inicio' | 'reportes' | 'directorio' | 'adopciones' | 'ayuda' | 'reportar' | 'notificaciones' | 'cuenta';

interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
  icono: string;
}

interface MensajeChat {
  tipo: 'usuario' | 'asistente';
  texto: string;
  hora: string;
}

interface TemaGuia {
  titulo: string;
  descripcion: string;
  icono: string;
  pasos: string[];
}

@Component({
  selector: 'app-ayuda-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ayuda-component.html',
  styleUrl: './ayuda-component.css'
})
export class AyudaComponent {
  @ViewChild('historialChat') historialChat?: ElementRef<HTMLDivElement>;

  vista: VistaAyuda = 'centro';
  menuAbierto = false;
  consulta = '';

  // Busca rutas ya declaradas en app.routes.ts. Si en tu proyecto usan otros
  // nombres, agrégalos a la lista correspondiente sin modificar las rutas.
  private readonly candidatos: Record<Destino, string[]> = {
    inicio: ['home-ciudadano', 'inicio-ciudadano', 'home', 'inicio'],
    reportes: ['reportes-ciudadano', 'mis-reportes', 'reportes', 'misreportes'],
    directorio: ['directorio', 'entidades', 'directorio-ciudadano'],
    adopciones: ['adopciones-ciudadano', 'adopciones', 'mascotas-disponibles'],
    ayuda: ['ayuda', 'ayuda-ciudadano'],
    reportar: ['reportar', 'crear-reporte', 'registro-reporte', 'nuevo-reporte'],
    notificaciones: ['notificaciones-ciudadano', 'notificaciones'],
    cuenta: ['mi-cuenta-ciudadano', 'mi-cuenta', 'perfil-ciudadano', 'cuenta', 'perfil']
  };

  readonly preguntasFrecuentes: PreguntaFrecuente[] = [
    {
      pregunta: '¿Cómo hago un reporte?',
      respuesta: 'Haz clic en “Reportar” desde el menú principal. Indica la ubicación, describe lo sucedido, selecciona el nivel de urgencia y adjunta al menos una foto como evidencia. Al enviar el reporte recibirás un código de seguimiento.',
      icono: 'documento-verde.png'
    },
    {
      pregunta: '¿Puedo reportar de forma anónima?',
      respuesta: 'El sistema utiliza un alias para proteger tu identidad en los reportes. Tu cuenta permanece identificada en la plataforma; no se trata de un registro completamente anónimo.',
      icono: 'huella-verde.png'
    },
    {
      pregunta: '¿Cómo reviso el estado de mi caso?',
      respuesta: 'Ingresa a “Mis reportes”, busca el caso y abre su detalle. Allí podrás revisar el progreso en los estados “Recibido”, “En revisión” y “Atendido”.',
      icono: 'reloj-verde.png'
    },
    {
      pregunta: '¿Cómo contacto una entidad de apoyo?',
      respuesta: 'Entra al “Directorio”, busca la entidad que necesitas y selecciona “Ver detalle”. Podrás consultar los datos de contacto y la ubicación que haya proporcionado la organización.',
      icono: 'directorio.png'
    }
  ];

  readonly temasSugeridos = [
    { titulo: 'Cómo reportar un caso', icono: 'documento-verde.png', pregunta: '¿Cómo hago un reporte?' },
    { titulo: 'Seguimiento de reportes', icono: 'reloj-verde.png', pregunta: '¿Cómo reviso el estado de mi caso?' },
    { titulo: 'Uso del directorio', icono: 'directorio.png', pregunta: '¿Cómo contacto una entidad de apoyo?' },
    { titulo: 'Adopciones y solicitudes', icono: 'adopcion.png', pregunta: '¿Cómo solicito adoptar una mascota?' },
    { titulo: 'Ayuda y soporte', icono: 'soporte.png', pregunta: '¿Qué puedo consultar aquí?' }
  ];

  readonly guias: TemaGuia[] = [
    {
      titulo: 'Cómo reportar un caso', descripcion: 'Registra un caso de maltrato o abandono animal.',
      icono: 'documento-verde.png',
      pasos: [
        'Ingresa a la sección “Reportar” desde el menú principal.',
        'Selecciona o confirma la ubicación del incidente.',
        'Adjunta al menos una fotografía y describe lo ocurrido.',
        'Selecciona el nivel de urgencia y revisa tus datos.',
        'Haz clic en “Enviar reporte” y guarda el código generado.'
      ]
    },
    {
      titulo: 'Seguimiento de reportes', descripcion: 'Consulta el estado de los casos que enviaste.',
      icono: 'reloj-verde.png',
      pasos: [
        'Ingresa a “Mis reportes”.',
        'Busca tu reporte por código o usa los filtros.',
        'Abre el detalle del caso y revisa su progreso.',
        'Comprueba las actualizaciones del estado y sus fechas.'
      ]
    },
    {
      titulo: 'Uso del directorio', descripcion: 'Encuentra entidades de apoyo animal.',
      icono: 'directorio.png',
      pasos: [
        'Abre la sección “Directorio”.',
        'Busca una entidad o utiliza los filtros disponibles.',
        'Selecciona “Ver detalle” para consultar su información.',
        'Revisa sus datos de contacto y ubicación.'
      ]
    },
    {
      titulo: 'Adopciones y solicitudes', descripcion: 'Conoce mascotas disponibles para adopción.',
      icono: 'adopcion.png',
      pasos: [
        'Ingresa a “Adopciones” y selecciona una mascota.',
        'Revisa sus detalles y requisitos.',
        'Haz clic en “Solicitar adopción”.',
        'Completa el formulario y envía tu solicitud.',
        'Consulta el progreso desde “Mis solicitudes”.'
      ]
    }
  ];

  mensajes: MensajeChat[] = [
    {
      tipo: 'asistente',
      texto: '¡Hola! Soy el asistente de Huellas de Auxilio. Puedo orientarte sobre reportes, seguimiento, directorio y adopciones. ¿En qué puedo ayudarte?',
      hora: 'Ahora'
    }
  ];

  constructor(private readonly router: Router) {}

  cambiarVista(vista: VistaAyuda): void {
    this.vista = vista;
    this.menuAbierto = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  seleccionarPregunta(pregunta: PreguntaFrecuente): void {
    this.cambiarVista('chat');
    this.agregarConversacion(pregunta.pregunta, pregunta.respuesta);
  }

  preguntar(texto: string): void {
    this.cambiarVista('chat');
    this.agregarConversacion(texto, this.buscarRespuesta(texto));
  }

  enviarConsulta(): void {
    const texto = this.consulta.trim();
    if (!texto) return;
    this.agregarConversacion(texto, this.buscarRespuesta(texto));
    this.consulta = '';
  }

  navegar(destino: Destino): void {
    this.menuAbierto = false;
    if (destino === 'ayuda') {
      this.cambiarVista('centro');
      return;
    }

    const rutas = this.listarRutas(this.router.config);
    const candidatos = this.candidatos[destino];
    const ruta = rutas.find(r => candidatos.includes(r.split('/').pop() || ''))
      ?? rutas.find(r => candidatos.some(c => r.split('/').pop()?.includes(c)));

    if (ruta) {
      void this.router.navigateByUrl('/' + ruta);
    } else {
      console.warn('Ruta no encontrada para:', destino, '. Revisa los candidatos del componente de ayuda.');
    }
  }

  private listarRutas(config: Route[], prefijo = ''): string[] {
    const resultado: string[] = [];
    for (const ruta of config) {
      const path = ruta.path || '';
      if (path === '**') continue;
      const completa = [prefijo, path].filter(Boolean).join('/');
      if (completa && !ruta.redirectTo) resultado.push(completa);
      if (ruta.children) resultado.push(...this.listarRutas(ruta.children, completa));
    }
    return resultado;
  }

  private buscarRespuesta(texto: string): string {
    const consulta = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (/hola|buenas|buenos dias|buenas tardes/.test(consulta)) {
      return '¡Hola! Puedes preguntarme cómo reportar un caso, dar seguimiento, consultar el directorio o enviar una solicitud de adopción.';
    }
    if (/anonim|identidad|alias|privacidad/.test(consulta)) return this.preguntasFrecuentes[1].respuesta;
    if (/solicitud|adopcion/.test(consulta) && /estado|seguimiento|revis|consult/.test(consulta)) {
      return 'Para consultar tus solicitudes de adopción, ingresa a “Mis solicitudes” y abre el detalle de la solicitud que deseas revisar.';
    }
    if (/seguimiento|progreso|estado|mi caso/.test(consulta)) return this.preguntasFrecuentes[2].respuesta;
    if (/reportar|reporte|denuncia|maltrato|abandono|evidencia|foto/.test(consulta)) return this.preguntasFrecuentes[0].respuesta;
    if (/directorio|entidad|refugio|veterinaria|organizacion/.test(consulta)) return this.preguntasFrecuentes[3].respuesta;
    if (/adop|mascota|perro|gato|solicitud/.test(consulta)) {
      return 'Ingresa a “Adopciones”, elige una mascota, revisa sus requisitos y selecciona “Solicitar adopción”. Completa el formulario y consulta su estado en “Mis solicitudes”.';
    }
    if (/cuenta|perfil|contrasena|correo|telefono/.test(consulta)) {
      return 'En “Mi cuenta” puedes revisar la información de tu perfil y utilizar las opciones disponibles para actualizar tus datos o contraseña.';
    }
    return 'Puedo orientarte sobre las funciones de Huellas de Auxilio. Prueba con los temas sugeridos o consulta la guía completa del Centro de ayuda.';
  }

  private agregarConversacion(pregunta: string, respuesta: string): void {
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    this.mensajes.push(
      { tipo: 'usuario', texto: pregunta, hora },
      { tipo: 'asistente', texto: respuesta, hora }
    );
    setTimeout(() => {
      const elemento = this.historialChat?.nativeElement;
      if (elemento) elemento.scrollTop = elemento.scrollHeight;
    }, 0);
  }
}
