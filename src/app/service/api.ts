import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Outbound } from '../models/outbound';

@Injectable({
  providedIn: 'root'
})
export class Api {
    private http = inject(HttpClient);
    private urlApi = 'http://127.0.0.1:8000/api'

    getoutbound(){
        return this.http.get<Outbound[]>(`${this.urlApi}/outbound`);
    }
}