import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  signin(credentials: { cpf: string; password: string }): Observable<{ accessToken: string; role: string }> {
    return this.http.post<{ accessToken: string; role: string }>(`${this.apiUrl}/signin`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('userRole', response.role);
      })
    );
  }

  hasRole(rolesPermitidas: string[]): boolean {
    const roleAtual = (this.getUserRole() || '').toLowerCase();
    return rolesPermitidas.map(r => r.toLowerCase()).includes(roleAtual);
  }


  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  signup(payload: { name: string; email: string; cpf: string; password: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/signup`, payload);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
