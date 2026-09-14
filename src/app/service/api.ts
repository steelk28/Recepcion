import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Outbound } from '../models/outbound';
import { CreateOutbound } from '../models/create-outbound';

@Injectable({
  providedIn: 'root'
})
export class Api {
    private http = inject(HttpClient);
    private urlApi = 'http://127.0.0.1:8000/api'

    getoutbound(){
        return this.http.get<Outbound[]>(`${this.urlApi}/outbound`);
    }

    createoutbound(outbound: CreateOutbound){
        return this.http.post<Outbound[]>(`${this.urlApi}/outbound`, outbound);
    }
}   