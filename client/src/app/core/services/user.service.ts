import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/user`; 

  private obterHeadersAutenticacao(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  atualizarFotoPerfil(arquivo: File): Observable<any> {
    const headers = this.obterHeadersAutenticacao();
    const formData = new FormData();
    formData.append('file', arquivo); 

    return this.http.patch(`${this.apiUrl}/perfil/avatar`, formData, { headers });
  }

  listarTodosColaboradores(): Observable<any[]> {
    const headers = this.obterHeadersAutenticacao();
    return this.http.get<any[]>(this.apiUrl, { headers });
  }

  cadastrarNovoColaborador(payload: any): Observable<any> {
    const headers = this.obterHeadersAutenticacao();
    return this.http.post<any>(this.apiUrl, payload, { headers });
  }

  alternarStatusAcesso(id: number): Observable<any> {
    const headers = this.obterHeadersAutenticacao();
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, {}, { headers });
  }
}
