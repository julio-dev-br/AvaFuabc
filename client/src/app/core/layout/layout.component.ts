import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

import { filter } from 'rxjs/operators';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatBadgeModule,
    MatTooltipModule 
  ],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}`;

  // Propriedade reativa que guardará os pedaços do nosso Breadcrumb
  breadcrumbs: Array<{ texto: string, url: string }> = [];

  notificacoes: any[] = [];

  // Objeto central do usuário carregado direto do Postgres
  usuario: any = {
    nome: 'Carregando...',
    email: '',
    avatarUrl: 'assets/default-avatar.png'
  };

  sidebarColapsada: boolean = false;
  menuMobileAberto: boolean = false;

  ngOnInit(): void {
    this.carregarDadosPerfilReal();
    this.carregarNotificacoes();

    // ESCUTA REATIVA DO BREADCRUMB: Atualiza a trilha automaticamente a cada clique!
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.gerarBreadcrumbs();
    });

    // Gera o primeiro breadcrumb logo no primeiro boot da página
    this.gerarBreadcrumbs();
  }

  // Mapeia matematicamente a URL do navegador em caminhos amigáveis e corporativos
  private gerarBreadcrumbs(): void {
    const urlAtual = this.router.url; // Pega ex: "/dashboard/cursos"
    const partes = urlAtual.split('/').filter(p => p && p !== 'dashboard'); // Remove vazios e a raiz

    // Todo breadcrumb sempre começa na Home do Portal
    this.breadcrumbs = [{ texto: 'Portal do Aluno', url: '/dashboard' }];

    let urlAcumulada = '/dashboard';

    partes.forEach((parte, index) => {
      // Ignora parâmetros numéricos de ID (como o ID do curso /curso/12) para não poluir
      if (isNaN(Number(parte))) {
        urlAcumulada += `/${parte}`;

        // Traduz o termo da URL para um nome comercial elegante da Fundação ABC
        let textoTraduzido = parte.charAt(0).toUpperCase() + parte.slice(1);
        if (parte === 'cursos') textoTraduzido = 'Meus Cursos';
        if (parte === 'progresso') textoTraduzido = 'Meu Progresso';
        if (parte === 'kanban') textoTraduzido = 'Quadro de Estudos';
        if (parte === 'perfil') textoTraduzido = 'Central da Conta';
        if (parte === 'forum') textoTraduzido = 'Fórum de Dúvidas';
        if (parte === 'quiz') textoTraduzido = 'Avaliação';
        if (parte === 'curso') textoTraduzido = 'Treinamento';

        this.breadcrumbs.push({ texto: textoTraduzido, url: urlAcumulada });
      }
    });
  }

  // 🌟 ADICIONE ESTE MÉTODO EXATAMENTE AQUI DENTRO DO SEU LAYOUT_COMPONENT
  marcarLida(id: number): void {
    this.notificationService.marcarComoLida(id).subscribe({
      next: () => {
        // Remove a notificação reativamente da lista da Master Page
        this.notificacoes = this.notificacoes.filter(n => n.id !== id);
      },
      error: (err: any) => {
        console.error('Erro ao marcar notificação como lida no layout master:', err);
      }
    });
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

  // Método que será chamado ao clicar no ícone de Hambúrguer / Setinha
  alternarSidebar(): void {
    // Se for Desktop, colapsa/recolhe a barra lateral
    if (window.innerWidth > 1024) {
      this.sidebarColapsada = !this.sidebarColapsada;
    } else {
      // Se for Mobile, abre e fecha o menu flutuante por completo
      this.menuMobileAberto = !this.menuMobileAberto;
    }
    console.log(`=== 🧭 SIDEBAR STATUS: Colapsada: ${this.sidebarColapsada} | Mobile Aberto: ${this.menuMobileAberto} ===`);
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
