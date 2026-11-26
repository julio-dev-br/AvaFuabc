import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../core/services/theme.service';
import { AdminTabService } from '../services/admin-tab.service';
import { LayoutService } from '../services/layout.service';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
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
export class LayoutComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  public tabService = inject(AdminTabService);
  public layoutService = inject(LayoutService);
  public themeService = inject(ThemeService);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}`;
  protected readonly window = window;

  private intervalNotificacoes: any;
  private routerSub?: Subscription;

  breadcrumbs: Array<{ texto: string; url: string }> = [];
  notificacoes: any[] = [];

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

    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.gerarBreadcrumbs();
      });

    this.gerarBreadcrumbs();
  }

  ngOnDestroy(): void {
    if (this.intervalNotificacoes) {
      clearInterval(this.intervalNotificacoes);
      this.intervalNotificacoes = null;
    }
    this.routerSub?.unsubscribe();
  }

  private gerarBreadcrumbs(): void {
    const urlAtual = this.router.url;
    const ehAdmin = urlAtual.includes('/admin');

    if (ehAdmin) {
      const partes = urlAtual.split('/').filter((p) => p && p !== 'dashboard' && p !== 'admin');
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
          if (parte === 'homologar') textoTraduzido = 'Homologação de Curso';

          this.breadcrumbs.push({ texto: textoTraduzido, url: urlAcumulada });
        }
      });
    } else {
      this.breadcrumbs = [{ texto: 'Portal do Aluno', url: '/dashboard' }];

      const segmentos = urlAtual.split('/').filter((p) => p);
      const idString = segmentos.find((s) => !isNaN(Number(s)));
      const idNum = idString ? Number(idString) : null;

      if (idNum && (urlAtual.includes('/forum/aula') || urlAtual.includes('/quiz/aula'))) {
        this.breadcrumbs.push({
          texto: 'Assistir Aula',
          url: `/dashboard/curso/${idNum}`
        });

        const termoFinal = urlAtual.includes('/forum/aula') ? 'Fórum de Dúvidas' : 'Avaliação Regulamentar';
        this.breadcrumbs.push({
          texto: termoFinal,
          url: urlAtual
        });
      } else {
        const partes = urlAtual.split('/').filter((p) => p && p !== 'dashboard');
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
        this.notificacoes = this.notificacoes.filter((n) => n.id !== id);
      },
      error: (err: any) => {
        console.error('Erro ao marcar notificação como lida no layout master:', err);
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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
      next: (dados: any[]) => {
        this.notificacoes = dados || [];
      },
      error: (err) => console.error('Erro ao carregar notificações no layout:', err)
    });

    if (this.intervalNotificacoes) {
      clearInterval(this.intervalNotificacoes);
    }

    this.intervalNotificacoes = setInterval(() => {
      this.notificationService.buscarNaoLidas().subscribe({
        next: (dados: any[]) => {
          if (dados && JSON.stringify(dados) !== JSON.stringify(this.notificacoes)) {
            this.notificacoes = dados;
          }
        },
        error: (err) => console.error('Erro no polling silencioso de notificações:', err)
      });
    }, 30000);
  }

  estaNoPainelAdmin(): boolean {
    return this.router.url.includes('/admin');
  }

  alternarSidebar(): void {
    if (window.innerWidth > 1024) {
      this.sidebarColapsada = !this.sidebarColapsada;
    } else {
      this.menuMobileAberto = !this.menuMobileAberto;
    }
  }

  isAdmin(): boolean {
    const role = (this.authService.getUserRole() || '').toLowerCase();
    return ['master', 'curador', 'conteudista', 'admin', 'manager'].includes(role);
  }

  podeGerenciarUsuarios(): boolean {
    const role = (this.authService.getUserRole() || '').toLowerCase();
    return role === 'master' || role === 'admin';
  }


  logout(): void {
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }
}
