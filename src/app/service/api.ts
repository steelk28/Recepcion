import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Outbound } from '../models/outbound';
import { CreateOutbound } from '../models/create-outbound';
import { Dependency } from '../models/dependency';
import { YearState } from '../models/year-state';   // NUEVO
import { Admin } from './admin';
import { OutboundHistory } from '../models/outbound-history';
import { Subarea } from '../models/subarea';
import { API_URL } from './config';
import { ClaimData } from "../models/claim-data";

@Injectable({
  providedIn: 'root'
})
export class Api {
    private http = inject(HttpClient);
    private admin = inject(Admin);

    private urlApi = API_URL;

    // CAMBIO: ahora acepta un año opcional. Sin año, trae el año en curso
    getoutbound(year?: number) {
        const url = year
            ? `${this.urlApi}/outbound?year=${year}`
            : `${this.urlApi}/outbound`;
        return this.http.get<Outbound[]>(url);
    }

    createoutbound(outbound: CreateOutbound) {
        return this.http.post<any>(`${this.urlApi}/outbound`, outbound);
    }

 // CAMBIO: ahora manda quién edita, y el encabezado de administrador (vacío si no lo es)
updateoutbound(id: number, data: { addressee: string; description: string; edited_by: string }) {
    return this.http.put<any>(`${this.urlApi}/outbound/${id}`, data, {
        headers: this.admin.headers()
    });
}

// CAMBIO: eliminar ahora requiere ser administrador
deleteoutbound(id: number) {
    return this.http.delete<any>(`${this.urlApi}/outbound/${id}`, {
        headers: this.admin.headers()
    });
}

// NUEVO
changeState(id: number, state: 'pendiente' | 'utilizado', changedBy: string) {
    return this.http.put<{ state: string; last_edited_by?: string | null; last_edited_at?: string | null }>(
        `${this.urlApi}/outbound/${id}/state`,
        { state, changed_by: changedBy },
        { headers: this.admin.headers() });
}

// NUEVO
getEdits(id: number) {
    return this.http.get<OutboundHistory>(`${this.urlApi}/outbound/${id}/edits`);
}

    // ----- Dependencias -----
    getDependencies(soloActivas?: boolean) {
        const url = soloActivas
            ? `${this.urlApi}/dependencies?active=1`
            : `${this.urlApi}/dependencies`;
        return this.http.get<Dependency[]>(url);
    }

    createDependency(data: { name: string; number: number }) {
        return this.http.post<Dependency>(`${this.urlApi}/dependencies`, data, {
            headers: this.admin.headers()
        });
    }

 updateDependency(id: number, data: { name?: string; number?: number; active?: boolean }) {
    return this.http.put<Dependency & { outbounds_updated?: number }>(
        `${this.urlApi}/dependencies/${id}`, data,
        { headers: this.admin.headers() }
    );
}

    // ----- Años (NUEVO) -----
    getYearState() {
        return this.http.get<YearState>(`${this.urlApi}/years/estado`);
    }

    changeYear() {
        return this.http.post<{ message: string }>(`${this.urlApi}/years/cambiar`, {}, {
            headers: this.admin.headers()
        });
    }

    // Nombres de quienes ya han creado números (para las sugerencias)
getCreators() {
    return this.http.get<string[]>(`${this.urlApi}/creators`);
}
createSubarea(dependencyId: number, name: string) {
    return this.http.post<Subarea>(`${this.urlApi}/dependencies/${dependencyId}/subareas`,
        { name },
        { headers: this.admin.headers() });
}

updateSubarea(id: number, data: { name?: string; active?: boolean }) {
    return this.http.put<Subarea & { outbounds_updated?: number }>(`${this.urlApi}/subareas/${id}`,
        data,
        { headers: this.admin.headers() });
}

// Tomar un número disponible: cambia dependencia, destinatario y asunto, y lo marca utilizado
claimOutbound(id: number, data: ClaimData) {
    return this.http.put<Outbound>(`${this.urlApi}/outbound/${id}/claim`, data);
}

// "Huella" del servidor: si cambia, hay datos nuevos
getSyncToken() {
    return this.http.get<{ token: string }>(`${this.urlApi}/sync/estado`);
}
}