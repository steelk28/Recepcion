import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../service/api';
import { Outbound } from '../models/outbound';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {

    private api = inject(Api);

  outbounds = signal<Outbound[]>([]);   

   areas = [
    { nombre: 'Gerencia', numero: 100 },
    { nombre: 'Jurídica', numero: 110 },
    { nombre: 'Control Interno', numero: 120 },
    { nombre: 'Subgerencia Administrativa', numero: 130 },
    { nombre: 'Comercial', numero: 131 },
    { nombre: 'Financiera', numero: 132 },
    { nombre: 'Gestión Administrativa', numero: 133 },
    { nombre: 'Subgerencia Operativa', numero: 140 },
    { nombre: 'Acueducto', numero: 141 },
    { nombre: 'Alcantarillado', numero: 142 },
    { nombre: 'Aseo', numero: 143 }
  ];

    busqueda = signal('');
  areaFiltro = signal('');   
  
  outboundsFiltrados = computed(() => {

    const texto = this.normalizar(this.busqueda());
    const area = this.areaFiltro();

    return this.outbounds().filter(o => {

      const coincideArea = !area || String(o.num_area) === area;

    
      const coincideTexto = !texto ||
        this.normalizar(String(o.consecutive)).includes(texto) ||
        this.normalizar(o.addressee).includes(texto) ||
        this.normalizar(o.description).includes(texto);

      return coincideArea && coincideTexto;
    });

  });

    ultimoConsecutivo = computed(() =>
    this.outbounds().reduce((max, o) => Math.max(max, Number(o.consecutive)), 0)
  );

 
  editando = signal<Outbound | null>(null);   
  editDestinatario = signal('');
  editAsunto = signal('');
  guardando = signal(false);

  ngOnInit() {
    this.cargarSalidas();
  }

  cargarSalidas() {

    this.api.getoutbound().subscribe({

      next: (datos) => {

        console.log('SALIDAS RECIBIDAS:', datos);

        this.outbounds.set(datos);

      },

      error: (error) => {

        console.error('ERROR AL CARGAR SALIDAS:', error);

      }

    });

  }

  abrirEditar(salida: Outbound) {
    this.editando.set(salida);
    this.editDestinatario.set(salida.addressee);
    this.editAsunto.set(salida.description);
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
      description: this.editAsunto().trim()
    };

    if (!data.addressee || !data.description) return;

    this.guardando.set(true);

    this.api.updateoutbound(salida.id, data).subscribe({

      next: () => {
        this.outbounds.update(lista =>
          lista.map(o => o.id === salida.id ? { ...o, ...data } : o)
        );
        this.guardando.set(false);
        this.cerrarEditar();
      },

      error: (error) => {
        console.error('ERROR AL EDITAR:', error);
        this.guardando.set(false);
        alert('No se pudo guardar los cambios.');
      }

    });

  }

  eliminar(salida: Outbound) {

    if (Number(salida.consecutive) !== this.ultimoConsecutivo()) return;

    const ok = confirm(`¿Seguro que quieres eliminar la salida N° ${salida.consecutive}?`);

    if (!ok) return;

    this.api.deleteoutbound(salida.id).subscribe({

      next: () => {
        this.outbounds.update(lista => lista.filter(o => o.id !== salida.id));
      },

      error: (error) => {
        console.error('ERROR AL ELIMINAR:', error);
        alert(error.error?.message ?? 'No se pudo eliminar.');
      }

    });

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
