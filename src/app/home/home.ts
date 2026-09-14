import { Component, inject } from '@angular/core';
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
export class Home {
   private api = inject(Api);
  outbounds: Outbound[] = [];

  ngOnInit() { 
    this.api.getoutbound().subscribe({
      next: (datos) => {
        console.log('¿ES ARRAY?', Array.isArray(datos));
        console.log('TIPO:', typeof datos);
        console.log('DATOS:', datos);
        this.outbounds= datos;
        console.log('SALIDAS DESPUÉS DE ASIGNAR:', this.outbounds.length);
        console.log('TODOS ELEMENTO:', datos);
      },
      error: (error) => {
        console.error('Error: ', error);
      }
    });
  }
}
