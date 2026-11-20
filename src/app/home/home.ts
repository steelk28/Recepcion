import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api } from '../service/api';
import { Admin } from '../service/admin';
import { Outbound } from '../models/outbound';
import { OutboundHistory } from '../models/outbound-history';
import { Dependency } from '../models/dependency';
import { YearState } from '../models/year-state';
import { ClaimData } from '../models/claim-data';

type CampoBusqueda = 'todos' | 'numero' | 'destinatario' | 'asunto';

// Debe ser igual al límite de Laravel (MAX_EDITS en OutboundController)
const MAX_EDICIONES = 2;

// Cada cuánto se revisa si hay cambios hechos desde otros equipos
const INTERVALO_ACTUALIZACION_MS = 10000;

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {

  private api = inject(Api);
  private destroyRef = inject(DestroyRef);
  admin = inject(Admin);

  outbounds = signal<Outbound[]>([]);
  areas = signal<Dependency[]>([]);

  // CAMBIO: ahora se guarda todo el estado del año (antes solo el año en curso)
  estadoAnio = signal<YearState | null>(null);
  anioActual = computed(() => this.estadoAnio()?.current_year ?? null);

  // NUEVO: aviso de nuevo año
  avisoCompacto = signal(false);   // true = franja pequeña (eligieron "Seguir en el año anterior")
  guiaAnio = signal(false);        // ventana con los pasos para cambiar de año

  // Última vez que se cargó la lista (se muestra en el encabezado)
  ultimaCarga = signal<Date | null>(null);
  private ultimoToken = '';

  // Filtros
  busqueda = signal('');
  campoBusqueda = signal<CampoBusqueda>('todos');
  areaFiltro = signal('');
  // 'pendiente' es el valor interno; en pantalla se llama "Disponible"
  estadoFiltro = signal<'' | 'pendiente' | 'utilizado'>('');

  outboundsFiltrados = computed(() => {

    const texto = this.normalizar(this.busqueda());
    const campo = this.campoBusqueda();
    const area = this.areaFiltro();
    const estado = this.estadoFiltro();

    return this.outbounds().filter(o => {

      const coincideArea = !area || String(o.num_area) === area;
      const coincideEstado = !estado || o.state === estado;

      if (!coincideArea || !coincideEstado) return false;
      if (!texto) return true;

      const enNumero =
        this.normalizar(this.formatearConsecutivo(o.consecutive)).includes(texto) ||
        this.normalizar(String(o.consecutive)).includes(texto);
      const enDestinatario = this.normalizar(o.addressee).includes(texto);
      const enAsunto = this.normalizar(o.description).includes(texto);

      switch (campo) {
        case 'numero':       return enNumero;
        case 'destinatario': return enDestinatario;
        case 'asunto':       return enAsunto;
        default:             return enNumero || enDestinatario || enAsunto;
      }

    });

  });

  totalDisponibles = computed(() =>
    this.outbounds().filter(o => o.state === 'pendiente').length
  );

  // Modal de edición
  editando = signal<Outbound | null>(null);
  editDestinatario = signal('');
  editAsunto = signal('');
  editNombre = signal('');
  guardando = signal(false);

  // Modal de historial (CAMBIO: ahora recibe el historial ya armado por eventos)
  historialDe = signal<Outbound | null>(null);
  historial = signal<OutboundHistory | null>(null);

  // Modal para usar un número disponible
  usando = signal<Outbound | null>(null);
  usoArea = signal<number | null>(null);
  usoSubarea = signal('');
  usoDestinatario = signal('');
  usoAsunto = signal('');
  usoNombre = signal('');
  tomando = signal(false);

  areasActivas = computed(() => this.areas().filter(a => a.active));

  usoSubareasActivas = computed(() => {
    const area = this.areasActivas().find(a => a.number === this.usoArea());
    return (area?.subareas ?? []).filter(s => s.active);
  });

  ngOnInit() {
    // Primero se anota la "huella" actual del servidor y luego se cargan los datos
    this.api.getSyncToken().subscribe({
      next: (t) => this.ultimoToken = t.token,
      error: () => { /* se reintenta en la siguiente revisión */ }
    });

    this.avisoCompacto.set(this.leerAvisoCompacto());

    this.cargarSalidas();
    this.cargarAnio();
    this.cargarAreas();

    this.iniciarActualizacionAutomatica();
  }

  // ---------- Carga de datos ----------

  cargarSalidas() {
    this.api.getoutbound().subscribe({
      next: (datos) => {
        this.outbounds.set(datos);
        this.ultimaCarga.set(new Date());
        this.revisarModalUsar(datos);
      },
      error: (error) => console.error('ERROR AL CARGAR SALIDAS:', error)
    });
  }

  cargarAnio() {
    this.api.getYearState().subscribe({
      next: (estado) => this.estadoAnio.set(estado),
      error: (error) => console.error('ERROR AL CARGAR EL AÑO:', error)
    });
  }

  cargarAreas() {
    this.api.getDependencies().subscribe({
      next: (datos) => this.areas.set(datos),
      error: (error) => console.error('ERROR AL CARGAR ÁREAS:', error)
    });
  }

  // ---------- Aviso de nuevo año (NUEVO) ----------

  private hoyTexto(): string {
    return new Date().toLocaleDateString('en-CA');   // AAAA-MM-DD con la fecha local
  }

  // "Seguir en el año anterior" solo oculta el aviso grande por el resto del día
  private leerAvisoCompacto(): boolean {
    try {
      return localStorage.getItem('aviso_anio_compacto') === this.hoyTexto();
    } catch {
      return false;
    }
  }

  seguirEnAnio() {
    try {
      localStorage.setItem('aviso_anio_compacto', this.hoyTexto());
    } catch {
      // no pasa nada
    }
    this.avisoCompacto.set(true);
  }

  abrirGuiaAnio() {
    this.guiaAnio.set(true);
    document.body.style.overflow = 'hidden';
  }

  cerrarGuiaAnio() {
    this.guiaAnio.set(false);
    document.body.style.overflow = '';
  }

  // ---------- Actualización automática ----------

  // Cada 10 segundos pregunta al servidor si algo cambió; solo entonces vuelve a cargar los datos.
  // No recarga la página, así que no se pierde lo que alguien esté escribiendo.
  private iniciarActualizacionAutomatica() {

    const revisar = () => {

      // Si la pestaña no se está viendo, no se gasta red
      if (document.hidden) return;

      this.api.getSyncToken().subscribe({

        next: ({ token }) => {
          if (this.ultimoToken && token !== this.ultimoToken) {
            this.cargarSalidas();
            this.cargarAnio();
            this.cargarAreas();
          }
          this.ultimoToken = token;
        },

        error: () => { /* sin conexión: se reintenta en el siguiente ciclo */ }

      });
    };

    const temporizador = setInterval(revisar, INTERVALO_ACTUALIZACION_MS);

    // Al volver a la pestaña se revisa de inmediato
    document.addEventListener('visibilitychange', revisar);

    this.destroyRef.onDestroy(() => {
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', revisar);
    });
  }

  formatearConsecutivo(numero: number): string {
    return String(numero).padStart(4, '0');
  }

  placeholderBusqueda(): string {
    switch (this.campoBusqueda()) {
      case 'numero':       return 'Escribe el número de salida (ej: 0010)';
      case 'destinatario': return 'Escribe el nombre del destinatario';
      case 'asunto':       return 'Escribe palabras del asunto';
      default:             return 'Busca por número, destinatario o asunto';
    }
  }

  // ---------- Nombre de quien hace la acción ----------

  private leerNombreGuardado(): string {
    try {
      return localStorage.getItem('ultimo_creador') ?? '';
    } catch {
      return '';
    }
  }

  private guardarNombre(nombre: string) {
    try {
      localStorage.setItem('ultimo_creador', nombre);
    } catch {
      // no pasa nada
    }
  }

  private preguntarNombre(texto: string): string | null {
    const nombre = (prompt(texto, this.leerNombreGuardado()) ?? '').trim();

    if (!nombre) return null;

    this.guardarNombre(nombre);
    return nombre;
  }

  // ---------- Usar un número disponible ----------

  abrirUsar(salida: Outbound) {

    const activas = this.areasActivas();
    const areaActual = activas.find(a => a.number === salida.num_area);
    const area = areaActual ?? activas[0] ?? null;

    const subareaActual = (area?.subareas ?? [])
      .find(s => s.active && s.name === salida.subarea);

    this.usando.set(salida);
    this.usoArea.set(area ? area.number : null);
    this.usoSubarea.set(subareaActual ? subareaActual.name : '');
    this.usoDestinatario.set(salida.addressee);
    this.usoAsunto.set(salida.description);
    this.usoNombre.set(this.leerNombreGuardado());

    document.body.style.overflow = 'hidden';
  }

  cerrarUsar() {
    this.usando.set(null);
    document.body.style.overflow = '';
  }

  cambiarUsoArea(numero: number) {
    this.usoArea.set(Number(numero));
    this.usoSubarea.set('');
  }

  confirmarUso() {

    const salida = this.usando();
    const area = this.usoArea();

    if (!salida || area === null || this.tomando()) return;

    const data: ClaimData = {
      num_area: area,
      subarea: this.usoSubarea() || null,
      addressee: this.usoDestinatario().trim(),
      description: this.usoAsunto().trim(),
      changed_by: this.usoNombre().trim()
    };

    if (!data.addressee || !data.description || !data.changed_by) return;

    this.tomando.set(true);

    this.api.claimOutbound(salida.id, data).subscribe({

      next: (actualizada) => {
        this.guardarNombre(data.changed_by);

        this.outbounds.update(lista =>
          lista.map(o => o.id === salida.id ? actualizada : o)
        );

        this.tomando.set(false);
        this.cerrarUsar();
      },

      error: (error) => {
        this.tomando.set(false);
        alert(error.error?.message ?? 'No se pudo tomar el número.');

        // 409 = otra persona lo tomó primero
        if (error.status === 409) {
          this.cerrarUsar();
          this.cargarSalidas();
        }
      }

    });

  }

  // Si mientras alguien llena el formulario otra persona toma ese número, el formulario se cierra
  private revisarModalUsar(datos: Outbound[]) {

    const abierto = this.usando();
    if (!abierto) return;

    const actual = datos.find(o => o.id === abierto.id);

    if (!actual || actual.state !== 'pendiente') {
      this.cerrarUsar();
      alert('Otra persona acaba de tomar este número. La lista se actualizó.');
    }
  }

  // ---------- Liberar (solo administrador) ----------

  liberarNumero(salida: Outbound) {

    const nombre = this.preguntarNombre(
      `Vas a LIBERAR la salida N° ${this.formatearConsecutivo(salida.consecutive)}: ` +
      `quedará disponible para que otra persona la use.\n\n` +
      `Escribe tu nombre (quedará en el historial):`
    );

    if (!nombre) return;

    this.cambiarEstado(salida, 'pendiente', nombre);
  }

  private cambiarEstado(salida: Outbound, estado: 'pendiente' | 'utilizado', nombre: string) {
    this.api.changeState(salida.id, estado, nombre).subscribe({

      next: (r) => {
        this.outbounds.update(lista =>
          lista.map(o => o.id === salida.id
            ? {
                ...o,
                state: estado,
                last_edited_by: r.last_edited_by ?? o.last_edited_by,
                last_edited_at: r.last_edited_at ?? o.last_edited_at
              }
            : o)
        );
      },

      error: (error) => {
        console.error('ERROR AL CAMBIAR ESTADO:', error);
        alert(error.error?.message ?? 'No se pudo cambiar el estado.');
      }

    });
  }

  // ---------- Edición (máximo 2 veces) ----------

  edicionesRestantes(salida: Outbound): number {
    return Math.max(0, MAX_EDICIONES - (salida.edit_count ?? 0));
  }

  puedeEditar(salida: Outbound): boolean {
    return this.admin.autorizado() || this.edicionesRestantes(salida) > 0;
  }

  abrirEditar(salida: Outbound) {
    this.editando.set(salida);
    this.editDestinatario.set(salida.addressee);
    this.editAsunto.set(salida.description);
    this.editNombre.set(this.leerNombreGuardado());
    document.body.style.overflow = 'hidden';
  }

  cerrarEditar() {
    this.editando.set(null);
    document.body.style.overflow = '';
  }

  guardarEdicion() {

    const salida = this.editando();

    if (!salida || this.guardando()) return;

    const data = {
      addressee: this.editDestinatario().trim(),
      description: this.editAsunto().trim(),
      edited_by: this.editNombre().trim()
    };

    if (!data.addressee || !data.description || !data.edited_by) return;

    this.guardando.set(true);

    this.api.updateoutbound(salida.id, data).subscribe({

      next: (respuesta) => {

        this.guardarNombre(data.edited_by);

        this.outbounds.update(lista =>
          lista.map(o => o.id === salida.id
            ? {
                ...o,
                addressee: respuesta.addressee,
                description: respuesta.description,
                edit_count: respuesta.edit_count,
                last_edited_by: respuesta.last_edited_by,
                last_edited_at: respuesta.last_edited_at
              }
            : o)
        );

        this.guardando.set(false);
        this.cerrarEditar();
      },

      error: (error) => {
        console.error('ERROR AL EDITAR:', error);
        this.guardando.set(false);
        alert(error.error?.message ?? 'No se pudo guardar los cambios.');
      }

    });

  }

  // ---------- Historial ----------

  verHistorial(salida: Outbound) {
    this.historialDe.set(salida);
    this.historial.set(null);   // null = todavía cargando
    document.body.style.overflow = 'hidden';

    this.api.getEdits(salida.id).subscribe({
      next: (datos) => this.historial.set(datos),
      error: (error) => console.error('ERROR AL CARGAR HISTORIAL:', error)
    });
  }

  cerrarHistorial() {
    this.historialDe.set(null);
    document.body.style.overflow = '';
  }

  private normalizar(valor: string | null | undefined): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}