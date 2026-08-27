import { Component, OnInit, inject } from '@angular/core'; // 🌟 CORRIGIDO PARA @angular/core
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router'; // 🌟 Importante: RouterOutlet e RouterLinkActive
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatBadgeModule
  ],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}`;

  notificacoes: any[] = [];
  
  // Objeto central do usuário carregado direto do Postgres
  usuario: any = {
    nome: 'Carregando...',
    email: '',
    avatarUrl: 'assets/default-avatar.png'
  };

  ngOnInit(): void {
    this.carregarDadosPerfilReal();
    this.carregarNotificacoes();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  carregarDadosPerfilReal(): void {
    this.http.get<any>(`${this.apiUrl}/user/perfil/me`, { headers: this.getHeaders() }).subscribe({
      next: (dados) => {
        this.usuario.nome = dados.nome;
        this.usuario.email = dados.email;
        if (dados.avatarUrl) {
          this.usuario.avatarUrl = dados.avatarUrl;
        }
      },
      error: (err) => console.error('Erro no layout master ao buscar usuário:', err)
    });
  }

  carregarNotificacoes(): void {
    this.notificationService.buscarNaoLidas().subscribe({
      next: (dados: any[]) => this.notificacoes = dados,
      error: (err) => console.error('Erro ao carregar notificações no layout:', err)
    });
  }

  isAdmin(): boolean {
    const role = this.authService.getUserRole();
    return role === 'admin' || role === 'manager';
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }
}
