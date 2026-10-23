import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KanbanService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/kanban`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  obterQuadro(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  criarColuna(titulo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/colunas`, { titulo }, { headers: this.getHeaders() });
  }

  criarCard(card: { colunaId: number; titulo: string; descricao?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/cards`, card, { headers: this.getHeaders() });
  }

  moverCard(cardId: number, colunaId: number, ordem: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cards/${cardId}/mover`, { colunaId, ordem }, { headers: this.getHeaders() });
  }

  atualizarCard(cardId: number, dados: { titulo: string; descricao?: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/cards/${cardId}`, dados, { headers: this.getHeaders() });
  }

  excluirCard(cardId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cards/${cardId}`, { headers: this.getHeaders() });
  }

  atualizarEstagioCardAdmin(cardId: number, colunaId: number, ordem: number = 1): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const payload = { 
      colunaId: Number(colunaId), 
      ordem: Number(ordem) 
    };

    return this.http.patch<any>(`${this.apiUrl}/admin/mover-card/${cardId}`, payload, { headers });
  }
}
