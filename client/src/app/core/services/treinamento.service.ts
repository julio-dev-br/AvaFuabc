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

  private obterHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  obterTreinamentosGerencial(): Observable<any[]> {
    const headers = this.obterHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/gerencial`, { headers });
  }

  adicionarModulo(payload: { treinamentoId: number; titulo: string; ordem: number }): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<any>(`${this.apiUrl}/admin/modulos`, payload, { headers });
  }

  adicionarAula(payload: { moduloId: number; titulo: string; videoUrl: string; ordem: number; descricao?: string }): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<any>(`${this.apiUrl}/admin/aulas`, payload, { headers });
  }

  obterTreinamentosDisponiveis(): Observable<any[]> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/disponiveis`, { headers });
  }

  obterConteudoCurso(id: number): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  private getAdminHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // 🌟 NOVO: Dispara a matrícula no banco de dados com padrão DTO corporativo
  matricularAluno(treinamentoId: number): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const payload = { treinamentoId: Number(treinamentoId) };

    // Bate diretamente no endpoint '@Post("matriculas")' que você tem no NestJS
    return this.http.post<any>(`${environment.apiUrl}/matriculas`, payload, { headers });
  }

  criarTreinamento(curso: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/criar`, curso, { headers: this.getAdminHeaders() });
  }

  criarModulo(modulo: { treinamentoId: number; titulo: string; ordem: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/modulos`, modulo, { headers: this.getAdminHeaders() });
  }

  criarAula(aula: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/aulas`, aula, { headers: this.getAdminHeaders() });
  }

  vincularPublico(vinculo: { treinamentoId: number; tipo: string; referenciaId: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/vincular-publico`, vinculo, { headers: this.getAdminHeaders() });
  }

  obterMetricasAnaliticas(): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/admin/metricas`, { headers });
  }

  obterDadosGamificacao(): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/aluno/gamificacao`, { headers });
  }

  // MÓDULO AUXILIAR INTERNO: Cabeçalho com Content-Type JSON para links
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. Busca a lista de materiais vinculados à aula real no Postgres
  obterMateriaisApoio(aulaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/materiais/aula/${aulaId}`, { headers: this.getHeaders() });
  }

  // 2. Envia o payload de link do SharePoint apontando para 'aulaId'
  adicionarMaterialApoio(payload: { aulaId: number; nome: string; url: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/materiais`, payload, { headers: this.getHeaders() });
  }

  // 3. Envia o arquivo físico do computador (FormData) carimbando apenas o Token
  uploadArquivoMaterialApoio(formData: FormData): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<any>(`${environment.apiUrl}/materiais/upload`, formData, { headers });
  }

  // 4. Remove o material da tabela Material através do ID dele
  removerMaterialApoio(materialId: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/materiais/${materialId}`, { headers: this.getHeaders() });
  }
}

