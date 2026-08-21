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

  // 👤 ROTA DO ALUNO: Busca as notificações não lidas para o sininho
  buscarNaoLidas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // 👤 ROTA DO ALUNO: Dispara a rota PATCH para marcar o alerta como lido e sumir com o badge
  marcarComoLida(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/ler`, {}, { headers: this.getHeaders() });
  }

  // 💼 ROTA DO GESTOR (NOVA): Dispara comunicados institucionais em massa cruzando filtros do Protheus
  dispararComunicadoAdmin(payload: { escopo: string; referenciaId: number | null; titulo: string; mensagem: string }): Observable<any> {
    // Bate cirurgicamente no endpoint @Post('admin/disparar') em português do NestJS
    return this.http.post<any>(`${this.apiUrl}/admin/disparar`, payload, { headers: this.getHeaders() });
  }
}
