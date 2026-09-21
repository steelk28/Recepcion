import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';    
import { Api } from '../service/api';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-new-number',
  imports: [ RouterLink, FormsModule],
  templateUrl: './new-number.html',
  styleUrl: './new-number.css',
})
export class NewNumber {

  private api = inject(Api);


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

  areaSeleccionada = this.areas[0];
  numeroArea = this.areaSeleccionada.numero;

  destinatario = '';
  asunto = '';

  showModal = signal(false);
  numberCreate = signal(0);

  creandoNumero = signal(false);


  cambiarArea(numero: number) {

    const area = this.areas.find(
      area => area.numero === Number(numero)
    );

    if (area) {
      this.areaSeleccionada = area;
      this.numeroArea = area.numero;
    }

  }


  cambiarNumeroArea(numero: number) {

    const area = this.areas.find(
      area => area.numero === Number(numero)
    );

    if (area) {
      this.areaSeleccionada = area;
      this.numeroArea = area.numero;
    }

  }


createNumber() {

  if (this.creandoNumero()) {
    return;
  }

  this.creandoNumero.set(true);

  const data = {
    num_area: this.numeroArea,
    date: new Date().toISOString().split('T')[0],
    addressee: this.destinatario,
    description: this.asunto,
    area: this.areaSeleccionada.nombre
  };

  this.api.createoutbound(data).pipe(finalize(() => this.creandoNumero.set(false))).subscribe({

    next: (respuesta: any) => {

      console.log('RESPUESTA DE CREAR:', respuesta);

      this.numberCreate.set(respuesta['N°']);

      this.showModal.set(true);

      document.body.style.overflow = 'hidden';

     

    },

    error: (error) => {

      console.error('Error al crear número:', error);

    }

  });

  }


  closeNumber() {

    this.showModal.set(false);

    document.body.style.overflow = '';


  }
}
