import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TreinamentoService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/treinamentos`;

  // 🔒 CENTRALIZADOR DE SEGURANÇA: Garante a fiação do JWT e Content-Type padrão para todas as chamadas
  private obterHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // 🔒 AUXILIAR PARA UPLOAD (FormData não pode receber Content-Type JSON manual)
  private obterHeadersUpload(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  obterTreinamentosGerencial(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/gerencial`, { headers: this.obterHeaders() });
  }

  adicionarModulo(payload: { treinamentoId: number; titulo: string; ordem: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/modulos`, payload, { headers: this.obterHeaders() });
  }

  adicionarAula(payload: { moduloId: number; titulo: string; videoUrl: string; ordem: number; descricao?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/aulas`, payload, { headers: this.obterHeaders() });
  }

  obterTreinamentosDisponiveis(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/disponiveis`, { headers: this.obterHeaders() });
  }

  obterConteudoCurso(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.obterHeaders() });
  }

  matricularAluno(treinamentoId: number): Observable<any> {
    const payload = { treinamentoId: Number(treinamentoId) };
    return this.http.post<any>(`${environment.apiUrl}/matriculas`, payload, { headers: this.obterHeaders() });
  }

  criarTreinamento(curso: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/criar`, curso, { headers: this.obterHeaders() });
  }

  criarModulo(modulo: { treinamentoId: number; titulo: string; ordem: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/modulos`, modulo, { headers: this.obterHeaders() });
  }

  criarAula(aula: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/aulas`, aula, { headers: this.obterHeaders() });
  }

  vincularPublico(vinculo: { treinamentoId: number; tipo: string; referenciaId: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/vincular-publico`, vinculo, { headers: this.obterHeaders() });
  }

  obterMetricasAnaliticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/metricas`, { headers: this.obterHeaders() });
  }

  obterDadosGamificacao(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aluno/gamificacao`, { headers: this.obterHeaders() });
  }

  obterMateriaisApoio(aulaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/materiais/aula/${aulaId}`, { headers: this.obterHeaders() });
  }

  adicionarMaterialApoio(payload: { aulaId: number; nome: string; url: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/materiais`, payload, { headers: this.obterHeaders() });
  }

  uploadArquivoMaterialApoio(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/materiais/upload`, formData, { headers: this.obterHeadersUpload() });
  }

  removerMaterialApoio(materialId: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/materiais/${materialId}`, { headers: this.obterHeaders() });
  }

  // 💼 ROTA DO GESTOR: Busca a lista de projetos apontando para o endpoint em português do NestJS
  obterProjetosAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/projetos`, { headers: this.obterHeaders() || this.obterHeaders() });
  }

}
