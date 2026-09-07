import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../service/api';
import { Salidas } from '../models/salidas';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
   private api = inject(Api);
  salidas: Salidas[] = [];

  ngOnInit() {
    this.api.getSalidas().subscribe({
      next: (datos) => {
        console.log('¿ES ARRAY?', Array.isArray(datos));
        console.log('TIPO:', typeof datos);
        console.log('DATOS:', datos);
        this.salidas = datos;
        console.log('SALIDAS DESPUÉS DE ASIGNAR:', this.salidas.length);
        console.log('PRIMER ELEMENTO:', datos[0]);
      },
      error: (error) => {
        console.error('Error: ', error);
      }
    });
  }
}
