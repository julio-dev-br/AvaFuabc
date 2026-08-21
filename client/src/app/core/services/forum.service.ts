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

  // Lista todos os tópicos de uma aula específica
  listarTopicosPorAula(aulaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/aulas/${aulaId}/topicos`, { headers: this.getHeaders() });
  }

  // Abre os detalhes de um tópico e traz todas as suas respostas
  obterDetalhesTopico(topicoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/topicos/${topicoId}`, { headers: this.getHeaders() });
  }

  // Cria um novo tópico/dúvida
  criarTopico(topico: { aulaId: number; titulo: string; conteudo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/topicos`, topico, { headers: this.getHeaders() });
  }

  // Envia uma resposta para um tópico existente
  responderTopico(topicoId: number, conteudo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/topicos/${topicoId}/respostas`, { conteudo }, { headers: this.getHeaders() });
  }
}
