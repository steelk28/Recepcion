import { Component, inject } from '@angular/core';
import { Api } from '../service/api';

@Component({
  selector: 'app-new-number',
  imports: [],
  templateUrl: './new-number.html',
  styleUrl: './new-number.css',
})
export class NewNumber {
  private Api = inject(Api);

  Salidas = [];
  
}
