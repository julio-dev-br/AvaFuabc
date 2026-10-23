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
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

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

  vincularPublico(payload: { treinamentoId: number; tipo: string; referenciaId: string | number }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/treinamentos/admin/vincular-publico`, payload, { headers: this.obterHeaders() });
  }

  removerVinculoPublico(vinculoId: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/treinamentos/admin/vincular-publico/${vinculoId}`, { headers: this.obterHeaders() });
  }

  obterDadosGamificacao(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aluno/gamificacao`, { headers: this.obterHeaders() });
  }

  obterMetricasPainel(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/treinamentos/admin/metricas`, { headers: this.obterHeaders() });
  }

  obterMetricasAnaliticas(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/treinamentos/admin/metricas/analiticas`, { headers: this.obterHeaders() });
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

  obterProjetosAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/projetos`, { headers: this.obterHeaders() });
  }

  obterEmpresasERP(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/empresas`, { headers: this.obterHeaders() });
  }

  obterUnidadesERP(empresaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/unidades?empresaId=${empresaId}`, { headers: this.obterHeaders() });
  }

  obterCargosERP(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/cargos`, { headers: this.obterHeaders() });
  }

  obterDepartamentosERP(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/departamentos`, {
      headers: this.obterHeaders()
    });
  }

  obterFuncionariosERP(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/funcionarios`, {
      headers: this.obterHeaders()
    });
  }

  salvarProgressoVideoaula(aulaId: number, payload: { tempoAssistido: number; concluida: boolean }) {
    return this.http.patch(`${environment.apiUrl}/aulas/${aulaId}/progresso`, payload, { headers: this.obterHeaders() });
  }

  publicarTreinamentoComKanban(treinamentoId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/publicar/${treinamentoId}`, {}, { headers: this.obterHeaders() });
  }
}
