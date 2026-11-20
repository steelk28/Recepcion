import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api } from '../service/api';
import { Outbound } from '../models/outbound';
import { Dependency } from '../models/dependency';
import { YearState } from '../models/year-state';

@Component({
  selector: 'app-informe',
  imports: [RouterLink, DatePipe],
  templateUrl: './informe.html',
  styleUrl: './informe.css',
})
export class Informe implements OnInit {

  private api = inject(Api);

  estado = signal<YearState | null>(null);
  anio = signal<number | null>(null);
  salidas = signal<Outbound[]>([]);
  areas = signal<Dependency[]>([]);
  cargando = signal(false);

  // Rango de fechas en formato AAAA-MM-DD
  desde = signal('');
  hasta = signal('');
  rangoActivo = signal('anio');   // para resaltar el botón elegido

  areaFiltro = signal('');
  estadoFiltro = signal<'' | 'pendiente' | 'utilizado'>('');

  // Fecha y hora en que se genera el informe
  ahora = signal(new Date());

  rangoInvalido = computed(() =>
    !!this.desde() && !!this.hasta() && this.desde() > this.hasta()
  );

  // Salidas del rango, de la más antigua a la más reciente
filas = computed(() => {

  // CAMBIO: con "Todo el año" no se filtra por fecha (así entran los sacados en enero)
  const todoElAnio = this.rangoActivo() === 'anio';
  const desde = todoElAnio ? '' : this.desde();
  const hasta = todoElAnio ? '' : this.hasta();
  const area = this.areaFiltro();
  const estado = this.estadoFiltro();

  return this.salidas()
    .filter(o => {
      const f = this.soloFecha(o.date);

      return (!desde || f >= desde) &&
             (!hasta || f <= hasta) &&
             (!area || String(o.num_area) === area) &&
             (!estado || o.state === estado);
    })
    .sort((a, b) => a.consecutive - b.consecutive);
});

  totales = computed(() => {
    const lista = this.filas();
    const utilizados = lista.filter(o => o.state === 'utilizado').length;

    return { total: lista.length, utilizados, disponibles: lista.length - utilizados };
  });

  textoArea = computed(() => {
    const a = this.areas().find(x => String(x.number) === this.areaFiltro());
    return a ? `${a.name} (${a.number})` : 'Todas';
  });

  textoEstado = computed(() => {
    switch (this.estadoFiltro()) {
      case 'pendiente': return 'Disponibles';
      case 'utilizado': return 'Utilizados';
      default:          return 'Todos';
    }
  });

  // Límites de los selectores de fecha: el año completo y todo el año siguiente,
// porque hay números del año sacados en enero (cuando el administrador aún no cambió de año)
limiteMin = computed(() => `${this.anio() ?? 0}-01-01`);
limiteMax = computed(() => `${(this.anio() ?? 0) + 1}-12-31`);

  ngOnInit() {

    this.api.getDependencies().subscribe({
      next: (datos) => this.areas.set(datos),
      error: (e) => console.error('ERROR AL CARGAR ÁREAS:', e)
    });

    this.api.getYearState().subscribe({
      next: (e) => {
        this.estado.set(e);
        this.anio.set(e.current_year);
        this.todoElAnio();
        this.cargarSalidas();
      },
      error: (e) => console.error('ERROR AL CARGAR EL AÑO:', e)
    });

  }

  cargarSalidas() {

    const anio = this.anio();
    if (!anio) return;

    this.cargando.set(true);

    this.api.getoutbound(anio).subscribe({
      next: (datos) => {
        this.salidas.set(datos);
        this.cargando.set(false);
      },
      error: (e) => {
        console.error('ERROR AL CARGAR SALIDAS:', e);
        this.cargando.set(false);
      }
    });

  }

  cambiarAnio(anio: number) {
    this.anio.set(Number(anio));
    this.todoElAnio();
    this.cargarSalidas();
  }

  // ---------- Atajos de fechas ----------

  todoElAnio() {
    const a = this.anio();
    if (!a) return;

    this.desde.set(`${a}-01-01`);
    this.hasta.set(`${a}-12-31`);
    this.rangoActivo.set('anio');
  }

  hoy() {
    const h = new Date();
    this.aplicar(h, h, 'hoy');
  }

  // La semana va de lunes a domingo
  estaSemana() {
    const h = new Date();
    const dif = (h.getDay() + 6) % 7;
    const lunes = new Date(h.getFullYear(), h.getMonth(), h.getDate() - dif);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    this.aplicar(lunes, domingo, 'semana');
  }

  esteMes() {
    const h = new Date();
    this.aplicar(
      new Date(h.getFullYear(), h.getMonth(), 1),
      new Date(h.getFullYear(), h.getMonth() + 1, 0),
      'mes'
    );
  }

  mesAnterior() {
    const h = new Date();
    this.aplicar(
      new Date(h.getFullYear(), h.getMonth() - 1, 1),
      new Date(h.getFullYear(), h.getMonth(), 0),
      'mesant'
    );
  }

  // Aplica un rango; si el atajo cae en otro año que tenga datos, cambia a ese año.
  // El informe se genera por año: si el rango cruza de año, se corta el 31 de diciembre.
  private aplicar(d1: Date, d2: Date, nombre: string) {

    const anioInicio = d1.getFullYear();
    const disponibles = this.estado()?.years ?? [];

    if (disponibles.includes(anioInicio)) {

      if (anioInicio !== this.anio()) {
        this.anio.set(anioInicio);
        this.cargarSalidas();
      }

      this.desde.set(this.recortar(this.aTexto(d1)));
      this.hasta.set(this.recortar(this.aTexto(d2)));

    } else {
      // Ese año no tiene datos: se muestra el rango tal cual y saldrá vacío
      this.desde.set(this.aTexto(d1));
      this.hasta.set(this.aTexto(d2));
    }

    this.rangoActivo.set(nombre);
  }

  cambiarDesde(valor: string) {
    this.desde.set(valor ? this.recortar(valor) : '');
    this.rangoActivo.set('personalizado');
  }

  cambiarHasta(valor: string) {
    this.hasta.set(valor ? this.recortar(valor) : '');
    this.rangoActivo.set('personalizado');
  }

  claseRango(nombre: string): string {
    const base = 'rounded-[10px] h-9 px-4 border border-blue-700 ';
    return base + (this.rangoActivo() === nombre
      ? 'bg-blue-700 text-white'
      : 'text-blue-700 hover:bg-blue-50');
  }

  imprimir() {
    this.ahora.set(new Date());                 // la hora del informe es la de ese momento
    setTimeout(() => window.print(), 50);       // deja que la pantalla se actualice antes de imprimir
  }

  // ---------- Utilidades ----------

  // Fecha local en formato AAAA-MM-DD (sin pasar por UTC)
  private aTexto(d: Date): string {
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  
 // Mantiene la fecha dentro del año seleccionado y el año siguiente
private recortar(texto: string): string {
  const a = this.anio();
  if (!a) return texto;

  const min = `${a}-01-01`;
  const max = `${a + 1}-12-31`;

  return texto < min ? min : texto > max ? max : texto;
}

  private soloFecha(f: string | null | undefined): string {
    return (f ?? '').substring(0, 10);
  }

  fechaCorta(f: string | null | undefined): string {
    const t = this.soloFecha(f);
    if (t.length < 10) return '—';
    return `${t.substring(8, 10)}/${t.substring(5, 7)}/${t.substring(0, 4)}`;
  }

  formatearConsecutivo(numero: number): string {
    return String(numero).padStart(4, '0');
  }
}