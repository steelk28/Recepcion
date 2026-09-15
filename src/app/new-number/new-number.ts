import { Component, inject } from '@angular/core';
import { Api } from '../service/api';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-new-number',
  imports: [RouterLink],
  templateUrl: './new-number.html',
  styleUrl: './new-number.css',
})
export class NewNumber {

  private Api = inject(Api);

  Salidas = [];

  areas = [
    {nombre: 'Gerencia', numero: 100},
    {nombre: 'Juridica', numero: 110},
    {nombre: 'Control Interno', numero: 120},
    {nombre: 'Subgerencia administrativa', numero: 130},
    {nombre: 'Comercial', numero: 131},
    {nombre: 'Financiera', numero: 132},
    {nombre: 'Gestión administrativa', numero: 133},
    {nombre: 'Subgerencia operativo', numero: 140},
    {nombre: 'Acueducto', numero: 141},
    {nombre: 'Alcantarillado - Ptar', numero: 142},
    {nombre: 'Aseo - Ambiental', numero: 143},
  ];


  areaSeleccionada = this.areas[0];

  numeroArea = this.areaSeleccionada.numero;
  
  showModal = true;

  numberCreate: number = 0;

  //código para seleccionar la misma area

  cambiarArea(numero: number){

    const areaEncontrada = this.areas.find(
      area => area.numero === Number(numero)
    );

    if (areaEncontrada){
      this.areaSeleccionada = areaEncontrada;
      this.numeroArea = areaEncontrada.numero;
    }
  }

  cambiarNumeroArea(numero: number){
    const areaEncontrada = this.areas.find(
      area => area.numero === Number(numero)
    );
    if(areaEncontrada){
      this.areaSeleccionada = areaEncontrada;
      this.numeroArea = areaEncontrada.numero;
    }
  }


//código para la pantalla emergente del nuevo numero
  createNumber(){
    this.numberCreate = 125;

    this.showModal = false;

   document.body.style.overflow = 'hidden';
  }

  closeNumber(){
    this.showModal = false;
    document.body.style.overflow = '';
  }
  
}
