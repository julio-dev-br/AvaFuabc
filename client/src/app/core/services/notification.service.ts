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
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // Busca as notificações não lidas diretamente do back-end
  buscarNaoLidas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Dispara a rota PATCH para marcar o alerta como lido
  marcarComoLida(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/ler`, {}, { headers: this.getHeaders() });
  }
}
