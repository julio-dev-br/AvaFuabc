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

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, 
      'access-token': token,             
      'token': token                    
    });
  }

  obterQuizPorAula(aulaId: number): Observable<any> {
    const token = localStorage.getItem('accessToken') || '';
    const urlComToken = `${this.apiUrl}/aula/${aulaId}?token=${token}&accessToken=${token}&access_token=${token}`;
    return this.http.get<any>(urlComToken, { headers: this.getHeaders() });
  }

  enviarRespostas(quizId: number, payload: { aulaId: number; respostas: any[] }): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${environment.apiUrl}/quizzes/${quizId}/responder`, payload, { headers });
  }

  criarQuizCompleto(payload: any): Observable<any> {
    const token = localStorage.getItem('accessToken') || '';
    const urlComToken = `${this.apiUrl}/admin/criar?token=${token}`;
    return this.http.post<any>(urlComToken, payload, { headers: this.getHeaders() });
  }

  salvarQuizGeradoPorIA(payload: {
    aulaId: number;
    titulo: string;
    notaMinima?: number;
    tentativas?: number;
    perguntas: any[];
  }): Observable<any> {
    const token = localStorage.getItem('accessToken') || '';
    const urlComToken = `${this.apiUrl}/admin/criar-gerado-ia?token=${token}`;
    return this.http.post<any>(urlComToken, payload, { headers: this.getHeaders() });
  }

}
