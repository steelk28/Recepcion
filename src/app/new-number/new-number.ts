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



  //código para la pantalla emergente
  showModal = true;

  numberCreate: number = 0;

  createNumber(){
    this.numberCreate = 125;

    this.showModal = true;

   document.body.style.overflow = 'hidden';
  }

  closeNumber(){
    this.showModal = false;
    document.body.style.overflow = '';
  }
  
}
