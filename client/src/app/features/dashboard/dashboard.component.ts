import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { TreinamentoService } from '../../core/services/treinamento.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

// Angular Material Components para o Dashboard
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
  private router = inject(Router);

  // Array que guardará a lista original de treinamentos vinda do NestJS
  treinamentos: any[] = [];
  notificacoes: any[] = [];

  rankingAlunos: any[] = [];
  minhasMedalhas: any[] = [];
  isLoading = true;

  // Variáveis de Controle de Busca e Paginação
  filtroTexto: string = '';
  paginaAtual: number = 1;
  itensPorPagina: number = 6; // Exibe 6 cards (grade ideal de 3x2) por página

  ngOnInit(): void {
    this.carregarCursos();
    this.carregarNotificacoes();
    this.carregarGamificacao();
  }

  // PROPRIEDADE COMPUTADA REATIVA: Filtra por título e fatia a lista para a página atual
  get treinamentosExibidos(): any[] {
    const textoBusca = this.filtroTexto.toLowerCase().trim();
    
    // 1. Filtra a lista com base no que foi digitado
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

    // A SINTONIA PREMUM DO CLIQUE: Matrícula automatizada antes de abrir o player!
  acessarCurso(treinamentoId: number): void {
    this.isLoading = true; // Liga o esqueleto/spinner visual se houver

    this.treinamentoService.matricularAluno(treinamentoId).subscribe({
      next: (res) => {
        console.log('=== POSTGRES: MATRÍCULA EFETIVADA COM SUCESSO ===', res);
        
        // Injeta o pop-up verde sutil avisando que a esteira de estudos começou!
        this.alerts.sucesso('Treinamento iniciado! Bons estudos.');

        //  NAVEGAÇÃO SEGURA: Só joga para o player após o banco confirmar o insert físico!
        this.router.navigate(['/curso', treinamentoId]);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao inicializar matrícula no NestJS:', err);
        this.isLoading = false;
        
        // Se der erro 400 por ele já estar matriculado, podemos apenas deixar navegar direto!
        if (err.status === 400 || err.error?.message?.includes('já matriculado')) {
          this.router.navigate(['/curso', treinamentoId]);
        } else {
          this.alerts.erro('Não foi possível iniciar este treinamento. Tente novamente.');
        }
      }
    });
  }

  // Métodos de navegação das páginas
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
        this.rankingAlunos = res.ranking;
        this.minhasMedalhas = res.medalhas;
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

  // abrirCurso(id: number): void {
  //   this.router.navigate([`/curso`, id]);
  // }

  abrirKanban(): void {
    this.router.navigate(['/kanban']);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }
}
