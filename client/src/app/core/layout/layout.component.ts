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
import { AdminTabService } from '../services/admin-tab.service';
import { LayoutService } from '../services/layout.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  public tabService = inject(AdminTabService);
  public layoutService = inject(LayoutService);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}`;

  protected readonly window = window;

  // Propriade reativa que guardará os pedaços do nosso Breadcrumb
  breadcrumbs: Array<{ texto: string, url: string }> = [];
  notificacoes: any[] = [];
  // Objeto central do usuário carregado direto do Postgres
  usuario: any = {
    nome: 'Carregando...',
    email: '',
    avatarUrl: 'assets/default-avatar.jpg'
  };

  sidebarColapsada: boolean = false;
  menuMobileAberto: boolean = false;

  ngOnInit(): void {
    this.carregarDadosPerfilReal();
    this.carregarNotificacoes();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.gerarBreadcrumbs();
    });

    this.gerarBreadcrumbs();
  }
  private gerarBreadcrumbs(): void {
    const urlAtual = this.router.url; // Pega ex: "/dashboard/forum/aula/12" ou "/dashboard/quiz/aula/5"

    const ehAdmin = urlAtual.includes('/admin');

    if (ehAdmin) {
      const partes = urlAtual.split('/').filter(p => p && p !== 'dashboard' && p !== 'admin');
      this.breadcrumbs = [{ texto: 'Painel Admin', url: '/admin/dashboard' }];
      let urlAcumulada = '/admin';

      partes.forEach((parte) => {
        if (isNaN(Number(parte))) {
          urlAcumulada += `/${parte}`;
          let textoTraduzido = parte.charAt(0).toUpperCase() + parte.slice(1);
          if (parte === 'cadastro') textoTraduzido = 'Fábrica de Conteúdos';
          if (parte === 'dashboard') textoTraduzido = 'Indicadores';
          if (parte === 'comunicados') textoTraduzido = 'Gestão de Comunicados';
          if (parte === 'usuarios') textoTraduzido = 'Perfis de Acesso';
          if (parte === 'projetos') textoTraduzido = 'Projetos Kanban';
          if (parte === 'chat') textoTraduzido = 'Chat Central (RH)';

          this.breadcrumbs.push({ texto: textoTraduzido, url: urlAcumulada });
        }
      });
    } else {
      this.breadcrumbs = [{ texto: 'Portal do Aluno', url: '/dashboard' }];
      // Quebra todas as partes da URL (ex: ['', 'dashboard', 'forum', 'aula', '12'])
      const segmentos = urlAtual.split('/').filter(p => p);
      const idString = segmentos.find(s => !isNaN(Number(s)));
      const idNum = idString ? Number(idString) : null;

      if (idNum && (urlAtual.includes('/forum/aula') || urlAtual.includes('/quiz/aula'))) {
        this.breadcrumbs.push({
          texto: 'Assistir Aula',
          url: `/dashboard/curso/${idNum}`
        });

        const termoFinal = urlAtual.includes('/forum/aula') ? 'Fórum de Dúvidas' : 'Avaliação Regulamentar';
        this.breadcrumbs.push({
          texto: termoFinal,
          url: urlAtual // Mantém a URL cheia por segurança
        });

      } else {
        const partes = urlAtual.split('/').filter(p => p && p !== 'dashboard');
        let urlAcumulada = '/dashboard';

        partes.forEach((parte) => {
          if (isNaN(Number(parte))) {
            urlAcumulada += `/${parte}`;

            let textoTraduzido = parte.charAt(0).toUpperCase() + parte.slice(1);
            if (parte === 'cursos') textoTraduzido = 'Meus Cursos';
            if (parte === 'progresso') textoTraduzido = 'Meu Progresso';
            if (parte === 'kanban') textoTraduzido = 'Quadro de Estudos';
            if (parte === 'perfil') textoTraduzido = 'Central da Conta';

            this.breadcrumbs.push({ texto: textoTraduzido, url: urlAcumulada });
          }
        });
      }
    }
  }

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
    setInterval(() => {
      this.notificationService.buscarNaoLidas().subscribe({
        next: (dados: any[]) => {
          if (dados) {
            this.notificacoes = dados;
          }
        },
        error: (err) => console.error('Erro no pooling silencioso de notificações:', err)
      });
    }, 30000); // 30000 ms = 30 segundos de intervalo
  }

  estaNoPainelAdmin(): boolean {
    return this.router.url.includes('/admin');
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
