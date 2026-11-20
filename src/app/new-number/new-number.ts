import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { Api } from '../service/api';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Dependency } from '../models/dependency';
import { YearState } from '../models/year-state';

@Component({
  selector: 'app-new-number',
  imports: [ RouterLink, FormsModule],
  templateUrl: './new-number.html',
  styleUrl: './new-number.css',
})
export class NewNumber implements OnInit {

  private api = inject(Api);

  areas = signal<Dependency[]>([]);
  areaSeleccionada = signal<Dependency | null>(null);

  subareaSeleccionada = signal('');
  subareasActivas = computed(() =>
    (this.areaSeleccionada()?.subareas ?? []).filter(s => s.active)
  );

  // NUEVO: estado del año (para avisar si ya empezó el año nuevo) y año del número creado
  estadoAnio = signal<YearState | null>(null);
  numberYear = signal<number | null>(null);

  creador = '';
  creadores = signal<string[]>([]);

  destinatario = '';
  asunto = '';

  showModal = signal(false);
  numberCreate = signal(0);

  creandoNumero = signal(false);

  ngOnInit() {

    this.api.getDependencies(true).subscribe({
      next: (datos) => {
        this.areas.set(datos);
        if (datos.length > 0) {
          this.areaSeleccionada.set(datos[0]);
        }
      },
      error: (e) => console.error('ERROR AL CARGAR DEPENDENCIAS:', e)
    });

    this.api.getCreators().subscribe({
      next: (nombres) => this.creadores.set(nombres),
      error: (e) => console.error('ERROR AL CARGAR NOMBRES:', e)
    });

    this.api.getYearState().subscribe({
      next: (estado) => this.estadoAnio.set(estado),
      error: (e) => console.error('ERROR AL CARGAR EL AÑO:', e)
    });

    try {
      this.creador = localStorage.getItem('ultimo_creador') ?? '';
    } catch {
      // si el navegador no deja guardar, no pasa nada
    }

  }

  cambiarArea(numero: number) {

    const area = this.areas().find(a => a.number === Number(numero));

    if (area) {
      this.areaSeleccionada.set(area);
      this.subareaSeleccionada.set('');
    }

  }

  createNumber() {

    if (this.creandoNumero()) {
      return;
    }

    const area = this.areaSeleccionada();

    if (!area) {
      return;
    }

    const nombre = this.creador.trim();

    if (!nombre) {
      return;
    }

    this.creandoNumero.set(true);

    // La fecha ya la pone el servidor; "date" se manda solo por compatibilidad y se ignora
    const data = {
      num_area: area.number,
      date: new Date().toLocaleDateString('en-CA'),
      addressee: this.destinatario,
      description: this.asunto,
      area: area.name,
      subarea: this.subareaSeleccionada() || null,
      created_by: nombre
    };

    this.api.createoutbound(data).pipe(finalize(() => this.creandoNumero.set(false))).subscribe({

      next: (respuesta: any) => {

        this.numberCreate.set(respuesta['N°']);
        this.numberYear.set(respuesta['year'] ?? null);

        this.showModal.set(true);

        document.body.style.overflow = 'hidden';

        try {
          localStorage.setItem('ultimo_creador', nombre);
        } catch {
          // no pasa nada
        }

      },

      error: (error) => {

        console.error('Error al crear número:', error);

        alert(error.error?.message ?? 'No se pudo crear el número.');

      }

    });

  }

  closeNumber() {

    this.showModal.set(false);

    document.body.style.overflow = '';

  }
}