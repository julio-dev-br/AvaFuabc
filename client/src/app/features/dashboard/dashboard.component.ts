import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TreinamentoService } from '../../core/services/treinamento.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Angular Material Components para o Dashboard de Alta Performance
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AlertsService } from '../../core/services/alerts.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatBadgeModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private treinamentoService = inject(TreinamentoService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private alerts = inject(AlertsService);
  private http = inject(HttpClient);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}`;

  // Arrays estruturais que guardam os dados vindos do banco PostgreSQL
  treinamentos: any[] = [];
  notificacoes: any[] = [];
  rankingAlunos: any[] = [];
  minhasMedalhas: any[] = [];
  isLoading = true;

  // Variáveis de Controle de Busca e Paginação Matemática
  filtroTexto: string = '';
  paginaAtual: number = 1;
  itensPorPagina: number = 6; // Exibe 6 cards (grade ideal de 3x2) por página

  // Controladores de Estado da Nova Sidebar SaaS e Responsividade Mobile
  abaAtiva: string = 'cursos';
  isSidebarAberta: boolean = true;
  isMobile: boolean = false;

  // Objeto recheado dinamicamente pelo PostgreSQL via Prisma
  usuario = {
    nome: '',
    email: '',
    empresa: '',
    unidade: '',
    cargo: '',
    avatarUrl: 'https://depositphotos.com'
  };

  // Escuta nativamente o redimensionamento do navegador para adequar a tela para Mobile!
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.verificarTamanhoTela();
  }

  // 🛡️ NG-ON-INIT REATIVO: Monitora a URL da Master Page a cada clique da Sidebar
  ngOnInit(): void {
    this.verificarTamanhoTela();
    this.carregarNotificacoes();
    this.carregarDadosPerfilReal(); // Carrega os dados reais do rodapé no boot inicial

    // 📡 ESCUTA DE ROTA EM TEMPO REAL: Se a URL mudar, chaveia a aba dinamicamente!
    this.router.events.subscribe(() => {
      const urlAtual = this.router.url;
      if (urlAtual.includes('progresso')) {
        this.mudarAba('progresso');
      } else {
        this.mudarAba('cursos');
      }
    });

    // Carga inicial de segurança com base na URL do momento do boot
    const urlBoot = this.router.url;
    this.mudarAba(urlBoot.includes('progresso') ? 'progresso' : 'cursos');
  }

  private verificarTamanhoTela(): void {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isSidebarAberta = false; // Fecha a barra por padrão no celular para dar espaço
    } else {
      this.isSidebarAberta = true;  // Mantém aberta fixada na lateral do computador
    }
  }

  // Reabastece o estado do Postgres conforme o aluno navega
  mudarAba(aba: string): void {
    this.abaAtiva = aba;
    console.log(`=== 📡 PORTAL ALUNO: CHAVEANDO PARA A ABA "${aba.toUpperCase()}" ===`);

    if (this.isMobile) {
      this.isSidebarAberta = false; // Auto-fecha a barra no mobile após o clique para liberar a tela
    }

    if (aba === 'cursos') {
      this.carregarCursos();
    }
    if (aba === 'progresso') {
      this.carregarGamificacao();
    }
    if (aba === 'kanban') {
      this.abrirKanban();
    }
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // 👤 BATE NO ENDPOINT DO POSTGRES AND ATUALIZA O SEU OBJETO 'USUARIO' EXISTENTE
  carregarDadosPerfilReal(): void {
    this.http.get<any>(`${this.apiUrl}/user/perfil/me`, { headers: this.getHeaders() }).subscribe({
      next: (dados) => {
        console.log('=== 📡 DATA RECEIVED FROM POSTGRES ===', dados);

        this.usuario.nome = dados.nome;
        this.usuario.email = dados.email;

        if (dados.avatarUrl) {
          this.usuario.avatarUrl = dados.avatarUrl;
        }

        console.log('=== 📡 POSTGRES: PERFIL DO RODAPÉ DA SIDEBAR ATUALIZADO COM SUCESSO! ===');
      },
      error: (err) => {
        console.error('Erro ao carregar dados cadastrais do Postgres:', err);
      }
    });
  }
  // PROPRIEDADE COMPUTADA REATIVA: Filtra por título e fatia a lista para a página atual
  get treinamentosExibidos(): any[] {
    const textoBusca = this.filtroTexto.toLowerCase().trim();

    // 1. Filtra a lista com base no que foi digitado na barra de pesquisa
    const filtrados = this.treinamentos.filter(curso =>
      curso.titulo?.toLowerCase().includes(textoBusca)
    );

    // 2. Trava de Segurança: impede que a paginação quebre se o usuário filtrar e estiver em uma página alta
    const maxPaginas = Math.ceil(filtrados.length / this.itensPorPagina) || 1;
    if (this.paginaAtual > maxPaginas) {
      this.paginaAtual = 1;
    }

    // 3. Executa o fatiamento matemático do array (limites da paginação)
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return filtrados.slice(inicio, fim);
  }

  // Calcula dinamicamente o número total de páginas baseado no filtro ativo
  get totalPaginas(): number {
    const textoBusca = this.filtroTexto.toLowerCase().trim();
    const filtrados = this.treinamentos.filter(curso =>
      curso.titulo?.toLowerCase().includes(textoBusca)
    );
    return Math.ceil(filtrados.length / this.itensPorPagina) || 1;
  }

  // A SINTONIA PREMIUM DO CLIQUE: Matrícula automatizada antes de abrir o player!
  acessarCurso(treinamentoId: number): void {
    this.isLoading = true;

    this.treinamentoService.matricularAluno(treinamentoId).subscribe({
      next: (res) => {
        console.log('=== POSTGRES: MATRÍCULA EFETIVADA COM SUCESSO ===', res);
        this.alerts.sucesso('Treinamento iniciado! Bons estudos.');
        // 🌟 SINTONIZADO COM A MASTER PAGE: Aponta o caminho relativo da rota filha
        this.router.navigate(['/dashboard/curso', treinamentoId]);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao inicializar matrícula no NestJS:', err);
        this.isLoading = false;

        if (err.status === 400 || err.error?.message?.includes('já matriculado')) {
          // 🌟 SINTONIZADO COM A MASTER PAGE: Aponta o caminho relativo da rota filha
          this.router.navigate(['/dashboard/curso', treinamentoId]);
        } else {
          this.alerts.erro('Não foi Counseling iniciar este treinamento. Tente novamente.');
        }
      }
    });
  }

  // Métodos executivos de navegação das páginas
  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  isAdmin(): boolean {
    const role = this.authService.getUserRole();
    return role === 'admin' || role === 'manager';
  }

  carregarCursos(): void {
    this.isLoading = true;
    this.treinamentoService.obterTreinamentosDisponiveis().subscribe({
      next: (dados) => {
        this.treinamentos = dados;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao buscar treinamentos:', err);
        this.isLoading = false;
      }
    });
  }

  carregarNotificacoes(): void {
    this.notificationService.buscarNaoLidas().subscribe({
      next: (dados: any[]) => {
        this.notificacoes = dados;
      },
      error: (err: any) => {
        console.error('Erro ao carregar notificações:', err);
      }
    });
  }

  carregarGamificacao(): void {
    this.treinamentoService.obterDadosGamificacao().subscribe({
      next: (res) => {
        this.rankingAlunos = res.ranking || [];
        this.minhasMedalhas = res.medalhas || [];
      },
      error: (err) => console.error('Erro ao buscar gamificação:', err)
    });
  }

  marcarLida(id: number): void {
    this.notificationService.marcarComoLida(id).subscribe({
      next: () => {
        this.notificacoes = this.notificacoes.filter(n => n.id !== id);
      },
      error: (err: any) => {
        console.error('Erro ao marcar notificação como lida:', err);
      }
    });
  }

  abrirKanban(): void {
    // 🌟 SINTONIZADO COM A MASTER PAGE: Aponta o caminho relativo da rota filha
    this.router.navigate(['/dashboard/kanban']);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }

} // Chave final da classe fechada com sucesso!
