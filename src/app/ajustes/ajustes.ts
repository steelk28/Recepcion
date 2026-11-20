import { Component, inject, signal } from '@angular/core';
import { Admin } from '../service/admin';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ajustes',
  imports: [ RouterLink, FormsModule],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.css',
})
export class Ajustes {
   private admin = inject(Admin);

  autorizado = this.admin.autorizado;   // se lee directo del servicio

  passwordEscrita = signal('');
  error = signal('');
  verificando = signal(false);

  entrar() {

    if (this.verificando()) return;

    const password = this.passwordEscrita().trim();

    if (!password) return;

    this.verificando.set(true);
    this.error.set('');

    this.admin.verificar(password).subscribe({

      next: (respuesta) => {

        this.verificando.set(false);

        if (respuesta.autorizado) {
          this.admin.guardarSesion(password);
        } else {
          this.error.set('Contraseña incorrecta.');
        }

      },

error: (e) => {
  this.verificando.set(false);

  // 429 = demasiados intentos fallidos
  this.error.set(
    e.status === 429
      ? (e.error?.message ?? 'Demasiados intentos. Espera unos minutos.')
      : 'No se pudo verificar. Revisa la conexión con el servidor.'
  );
}

    });

  }

  salir() {
    this.admin.cerrarSesion();
  }
}
