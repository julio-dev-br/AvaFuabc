import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/gemini`; // Chaveia perfeitamente para nosso endpoint NestJS

  // 🔒 CENTRALIZADOR DE SEGURANÇA: Herda a fiação padrão do token JWT de Autenticação
  private obterHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Dispara o texto técnico regulamentar colado pelo RH para o NestJS/Gemini
   * @param texto O conteúdo descritivo ou apostila da NR para processamento por IA
   * @returns Retorna um Observable contendo o array purificado de 5 questões montado pelo Gemini
   */
  gerarQuestoesAutomaticas(texto: string): Observable<any[]> {
    const payload = { texto };
    return this.http.post<any[]>(`${this.apiUrl}/gerar-quiz`, payload, { headers: this.obterHeaders() });
  }
}
