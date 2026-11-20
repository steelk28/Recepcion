import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../service/api';
import { Admin } from '../service/admin';
import { Dependency } from '../models/dependency';
import { Subarea } from '../models/subarea';

@Component({
  selector: 'app-dependencias',
  imports: [RouterLink],
  templateUrl: './dependencias.html',
  styleUrl: './dependencias.css',
})
export class Dependencias implements OnInit {

  private api = inject(Api);
  admin = inject(Admin);

  dependencies = signal<Dependency[]>([]);

  // Crear dependencia
  nombreNuevo = signal('');
  numeroNuevo = signal<number | null>(null);
  guardando = signal(false);
  error = signal('');

  // Editar dependencia
  editando = signal<Dependency | null>(null);
  editNombre = signal('');
  editNumero = signal<number | null>(null);
  errorEdicion = signal('');

  // NUEVO: subáreas (se guarda solo el id; la dependencia se busca en la lista para que siempre esté al día)
  subDeId = signal<number | null>(null);
  subDe = computed(() => this.dependencies().find(d => d.id === this.subDeId()) ?? null);
  nombreSub = signal('');
  errorSub = signal('');
  subEditId = signal<number | null>(null);
  subEditNombre = signal('');

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.getDependencies().subscribe({
      next: (datos) => this.dependencies.set(datos),
      error: (e) => console.error('ERROR AL CARGAR DEPENDENCIAS:', e)
    });
  }

  // Saca el primer mensaje de validación que mande Laravel
  private mensajeDeError(e: any, porDefecto: string): string {
    const errores = e?.error?.errors;

    if (errores) {
      const primero = (Object.values(errores) as string[][]).flat()[0];
      if (typeof primero === 'string') return primero;
    }

    return e?.error?.message ?? porDefecto;
  }

  // ---------- Dependencias ----------

  crear() {

    if (this.guardando()) return;

    const nombre = this.nombreNuevo().trim();
    const numero = this.numeroNuevo();

    if (!nombre || !numero) {
      this.error.set('Completa el nombre y el número.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    this.api.createDependency({ name: nombre, number: numero }).subscribe({

      next: (nueva) => {
        this.dependencies.update(lista => [...lista, nueva].sort((a, b) => a.number - b.number));
        this.nombreNuevo.set('');
        this.numeroNuevo.set(null);
        this.guardando.set(false);
      },

      error: (e) => {
        this.guardando.set(false);
        this.error.set(this.mensajeDeError(e, 'No se pudo crear la dependencia.'));
      }

    });

  }

  cambiarEstado(dep: Dependency) {

    const nuevoEstado = !dep.active;

    this.api.updateDependency(dep.id, { active: nuevoEstado }).subscribe({

      next: () => {
        this.dependencies.update(lista =>
          lista.map(d => d.id === dep.id ? { ...d, active: nuevoEstado } : d)
        );
      },

      error: (e) => {
        alert(this.mensajeDeError(e, 'No se pudo cambiar el estado.'));
      }

    });

  }

  abrirEditar(dep: Dependency) {
    this.editando.set(dep);
    this.editNombre.set(dep.name);
    this.editNumero.set(dep.number);
    this.errorEdicion.set('');
  }

  cerrarEditar() {
    this.editando.set(null);
  }

  guardarEdicion() {

    const dep = this.editando();

    if (!dep || this.guardando()) return;

    const nombre = this.editNombre().trim();
    const numero = this.editNumero();

    if (!nombre || !numero) {
      this.errorEdicion.set('Completa el nombre y el número.');
      return;
    }

    const cambios: { name?: string; number?: number } = {};
    if (nombre !== dep.name) cambios.name = nombre;
    if (numero !== dep.number) cambios.number = numero;

    if (Object.keys(cambios).length === 0) {
      this.cerrarEditar();
      return;
    }

    const ok = confirm(
      'Este cambio también se aplicará a las salidas que ya se crearon con esta dependencia.\n\n¿Continuar?'
    );

    if (!ok) return;

    this.guardando.set(true);
    this.errorEdicion.set('');

    this.api.updateDependency(dep.id, cambios).subscribe({

      next: (respuesta) => {

        this.dependencies.update(lista =>
          lista
            .map(d => d.id === dep.id ? { ...d, name: respuesta.name, number: respuesta.number } : d)
            .sort((a, b) => a.number - b.number)
        );

        this.guardando.set(false);
        this.cerrarEditar();

        if (respuesta.outbounds_updated) {
          alert(`Listo. También se actualizaron ${respuesta.outbounds_updated} salida(s) ya creadas.`);
        }
      },

      error: (e) => {
        this.guardando.set(false);
        this.errorEdicion.set(this.mensajeDeError(e, 'No se pudo guardar los cambios.'));
      }

    });

  }

  // ---------- Subáreas (NUEVO) ----------

  private ordenarSub(lista: Subarea[]): Subarea[] {
    return [...lista].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  // Cambia la lista de subáreas de una dependencia dentro de la lista general
  private actualizarSubareas(depId: number, fn: (lista: Subarea[]) => Subarea[]) {
    this.dependencies.update(lista =>
      lista.map(d => d.id === depId ? { ...d, subareas: fn(d.subareas ?? []) } : d)
    );
  }

  abrirSubareas(dep: Dependency) {
    this.subDeId.set(dep.id);
    this.nombreSub.set('');
    this.errorSub.set('');
    this.subEditId.set(null);
  }

  cerrarSubareas() {
    this.subDeId.set(null);
  }

  crearSubarea() {

    const dep = this.subDe();
    const nombre = this.nombreSub().trim();

    if (!dep || this.guardando()) return;

    if (!nombre) {
      this.errorSub.set('Escribe el nombre de la subárea.');
      return;
    }

    this.guardando.set(true);
    this.errorSub.set('');

    this.api.createSubarea(dep.id, nombre).subscribe({

      next: (nueva) => {
        this.actualizarSubareas(dep.id, lista => this.ordenarSub([...lista, nueva]));
        this.nombreSub.set('');
        this.guardando.set(false);
      },

      error: (e) => {
        this.guardando.set(false);
        this.errorSub.set(this.mensajeDeError(e, 'No se pudo crear la subárea.'));
      }

    });

  }

  empezarEditarSub(s: Subarea) {
    this.subEditId.set(s.id);
    this.subEditNombre.set(s.name);
    this.errorSub.set('');
  }

  cancelarEditarSub() {
    this.subEditId.set(null);
  }

  guardarSub(s: Subarea) {

    const nombre = this.subEditNombre().trim();

    if (!nombre) {
      this.errorSub.set('Escribe el nombre de la subárea.');
      return;
    }

    if (nombre === s.name) {
      this.cancelarEditarSub();
      return;
    }

    const ok = confirm(
      'Este cambio también se aplicará a las salidas ya creadas con esta subárea.\n\n¿Continuar?'
    );

    if (!ok) return;

    this.api.updateSubarea(s.id, { name: nombre }).subscribe({

      next: (r) => {
        this.actualizarSubareas(s.dependency_id, lista =>
          this.ordenarSub(lista.map(x => x.id === s.id ? { ...x, name: r.name } : x))
        );
        this.subEditId.set(null);
        this.errorSub.set('');

        if (r.outbounds_updated) {
          alert(`Listo. También se actualizaron ${r.outbounds_updated} salida(s) ya creadas.`);
        }
      },

      error: (e) => {
        this.errorSub.set(this.mensajeDeError(e, 'No se pudo guardar la subárea.'));
      }

    });

  }

  cambiarEstadoSub(s: Subarea) {

    const nuevoEstado = !s.active;

    this.api.updateSubarea(s.id, { active: nuevoEstado }).subscribe({

      next: () => {
        this.actualizarSubareas(s.dependency_id, lista =>
          lista.map(x => x.id === s.id ? { ...x, active: nuevoEstado } : x)
        );
      },

      error: (e) => {
        this.errorSub.set(this.mensajeDeError(e, 'No se pudo cambiar el estado.'));
      }

    });

  }
}