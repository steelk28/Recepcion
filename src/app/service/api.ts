import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Salidas } from '../models/salidas';

@Injectable({
  providedIn: 'root'
})
export class Api {
    private http = inject(HttpClient);
    private urlApi = 'http://127.0.0.1:8000/api'

    getSalidas(){
        return this.http.get<Salidas[]>(`${this.urlApi}/salidas`);
    }
}