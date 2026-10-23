import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notificacoes`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  buscarNaoLidas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  marcarComoLida(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/ler`, {}, { headers: this.getHeaders() });
  }

  dispararComunicadoAdmin(payload: { escopo: string; referenciaId: number | null; titulo: string; mensagem: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/disparar`, payload, { headers: this.getHeaders() });
  }


  obterHistoricoAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/historico`, { headers: this.getHeaders() });
  }

}
