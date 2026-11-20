import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api } from '../service/api';
import { Admin } from '../service/admin';
import { Outbound } from '../models/outbound';
import { YearState } from '../models/year-state';

@Component({
  selector: 'app-anios',
  imports: [RouterLink, DatePipe],
  templateUrl: './anios.html',
  styleUrl: './anios.css',
})
export class Anios implements OnInit {

  private api = inject(Api);
  admin = inject(Admin);

  estado = signal<YearState | null>(null);
  anioSeleccionado = signal<number | null>(null);
  salidas = signal<Outbound[]>([]);
  busqueda = signal('');
  cambiando = signal(false);

  // NUEVO: ventana de advertencia antes de cambiar de año
  modalCambio = signal(false);
  respaldoHecho = signal(false);

  salidasFiltradas = computed(() => {
    const texto = this.normalizar(this.busqueda());

    return this.salidas().filter(o =>
      !texto ||
      this.normalizar(this.formatearConsecutivo(o.consecutive)).includes(texto) ||
      this.normalizar(String(o.consecutive)).includes(texto) ||
      this.normalizar(o.addressee).includes(texto) ||
      this.normalizar(o.description).includes(texto) ||
      this.normalizar(o.area).includes(texto) ||
      this.normalizar(o.subarea).includes(texto)
    );
  });

  ngOnInit() {
    this.cargarEstado(true);
  }

  cargarEstado(reiniciarSeleccion: boolean) {
    this.api.getYearState().subscribe({
      next: (estado) => {
        this.estado.set(estado);

        if (reiniciarSeleccion || this.anioSeleccionado() === null) {
          this.anioSeleccionado.set(estado.current_year);
        }

        this.cargarSalidas();
      },
      error: (e) => console.error('ERROR AL CARGAR ESTADO DE AÑOS:', e)
    });
  }

  cargarSalidas() {
    const anio = this.anioSeleccionado();
    if (!anio) return;

    this.api.getoutbound(anio).subscribe({
      next: (datos) => this.salidas.set(datos),
      error: (e) => console.error('ERROR AL CARGAR SALIDAS DEL AÑO:', e)
    });
  }

  seleccionarAnio(anio: number) {
    this.anioSeleccionado.set(Number(anio));
    this.busqueda.set('');
    this.cargarSalidas();
  }

  // ---------- Cambio de año (CAMBIO: ahora con ventana de advertencia) ----------

  abrirCambioAnio() {
    const e = this.estado();
    if (!e || !e.can_change) return;

    this.respaldoHecho.set(false);
    this.modalCambio.set(true);
    document.body.style.overflow = 'hidden';
  }

  cerrarCambioAnio() {
    this.modalCambio.set(false);
    document.body.style.overflow = '';
  }

  confirmarCambioAnio() {

    const e = this.estado();

    if (!e || !e.can_change || !this.respaldoHecho() || this.cambiando()) return;

    this.cambiando.set(true);

    this.api.changeYear().subscribe({

      next: (respuesta) => {
        this.cambiando.set(false);
        this.cerrarCambioAnio();
        alert(respuesta.message);
        this.cargarEstado(true);
      },

      error: (err) => {
        this.cambiando.set(false);
        alert(err.error?.message ?? 'No se pudo cambiar de año.');
      }

    });

  }

  formatearConsecutivo(numero: number): string {
    return String(numero).padStart(4, '0');
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