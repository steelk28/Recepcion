import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { API_URL } from './config';

@Injectable({
  providedIn: 'root'
})
export class Admin {
      private http = inject(HttpClient);
  private urlApi = API_URL;

  // true si ya se verificó la contraseña en esta sesión del navegador
  autorizado = signal(this.leerAutorizacionGuardada());

  private leerAutorizacionGuardada(): boolean {
    return !!sessionStorage.getItem('admin_password');
  }

  verificar(password: string) {
    return this.http.post<{ autorizado: boolean }>(`${this.urlApi}/admin/verificar`, { password });
  }

  // Guarda la contraseña SOLO en esta pestaña del navegador (se borra al cerrarla)
  guardarSesion(password: string) {
    sessionStorage.setItem('admin_password', password);
    this.autorizado.set(true);
  }

  cerrarSesion() {
    sessionStorage.removeItem('admin_password');
    this.autorizado.set(false);
  }

  // Encabezado que hay que mandar en cada petición protegida
  headers(): HttpHeaders {
    const password = sessionStorage.getItem('admin_password') ?? '';
    return new HttpHeaders().set('X-Admin-Password', password);
  }
}
