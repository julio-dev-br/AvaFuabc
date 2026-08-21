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

  // Realiza o login e salva o token JWT automaticamente
  signin(credentials: { email: string; password: string }): Observable<{ accessToken: string; role: string }> {
    // Adicionamos a tipagem da role no retorno do POST
    return this.http.post<{ accessToken: string; role: string }>(`${this.apiUrl}/signin`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('userRole', response.role); 
      })
    );
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, userData);
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
