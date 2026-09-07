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
  
}
