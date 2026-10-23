import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private http = inject(HttpClient);
  private readonly apiUrl =  `${environment.apiUrl}/forum`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  listarTopicosPorAula(aulaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/aulas/${aulaId}/topicos`, { headers: this.getHeaders() });
  }

  obterDetalhesTopico(topicoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/topicos/${topicoId}`, { headers: this.getHeaders() });
  }

  criarTopico(topico: { aulaId: number; titulo: string; conteudo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/topicos`, topico, { headers: this.getHeaders() });
  }

  responderTopico(topicoId: number, conteudo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/topicos/${topicoId}/respostas`, { conteudo }, { headers: this.getHeaders() });
  }
}
