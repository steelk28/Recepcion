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
    return this.http.post<any>(`${this.urlApi}/outbound`, outbound);
}

  updateoutbound(id: number, data: {addressee: string, description: string,}) {
    return this.http.put<any>(`${this.urlApi}/outbound/${id}`, data);
  }

  deleteoutbound(id: number) {
    return this.http.delete<any>(`${this.urlApi}/outbound/${id}`);
  }
}   