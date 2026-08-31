import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/quizzes`;

  // Envia o token em todos os formatos comuns que o Guard do NestJS pode estar esperando
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Formato 1: Padrão JWT internacional
      'access-token': token,             // Formato 2: Customizado comum em Guards manuais
      'token': token                     // Formato 3: Chave limpa direta
    });
  }

  // Busca o quiz de uma aula (Injetando o token também via Query String na URL)
  obterQuizPorAula(aulaId: number): Observable<any> {
    const token = localStorage.getItem('accessToken') || '';

    // Se o Guard do NestJS buscar o token na rota, ele vai achar aqui!
    const urlComToken = `${this.apiUrl}/aula/${aulaId}?token=${token}&accessToken=${token}&access_token=${token}`;

    return this.http.get<any>(urlComToken, { headers: this.getHeaders() });
  }

  // Altera a tipagem do payload para aceitar o objeto contendo o aulaId e o array de respostas
  enviarRespostas(quizId: number, payload: { aulaId: number; respostas: any[] }): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Dispara a requisição POST enviando o objeto envelopado para a API do NestJS
    return this.http.post<any>(`${environment.apiUrl}/quizzes/${quizId}/responder`, payload, { headers });
  }

  // Criação do Quiz Completo (Painel do Administrador)
  criarQuizCompleto(payload: any): Observable<any> {
    const token = localStorage.getItem('accessToken') || '';
    const urlComToken = `${this.apiUrl}/admin/criar?token=${token}`;
    return this.http.post<any>(urlComToken, payload, { headers: this.getHeaders() });
  }
}
