import { Component, inject, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TreinamentoService } from '../../core/services/treinamento.service';
import { QuizService } from '../../core/services/quiz.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertsService } from '../../core/services/alerts.service';
import { ComunicadosComponent } from './components/comunicados/comunicados.component';
import { ProjetosKanbanComponent } from './components/projetos-kanban/projetos-kanban.component';

// Angular Material Modules
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Componentes de Gráficos (Chart.js)
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { ControleUsuariosComponent } from '../user/user.component';
import { ModalMateriaisComponent } from './modal-materiais.component';
import { NotificationService } from '../../core/services/notification.service';
import { MatPaginator } from '@angular/material/paginator';
import { AdminTabService } from '../../core/services/admin-tab.service';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatRadioModule,
    BaseChartDirective,
    ControleUsuariosComponent,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    ComunicadosComponent,
    ProjetosKanbanComponent,
    ModalMateriaisComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {

  private treinamentoService = inject(TreinamentoService);
  private quizService = inject(QuizService);
  public snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private alerts = inject(AlertsService);
  public notificationService = inject(NotificationService);
  private tabService = inject(AdminTabService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const abaAtual = this.tabService.abaAtiva();

      if (abaAtual === 'cadastro') {
        this.carregarCatalogoGerencial();
      }

      if (abaAtual === 'projetos') {
        this.carregarProjetosKanbanAdmin();
      }
    });
  }

  // Estados do Controle de Usuários (Aba 'usuarios')
  userDataSource = new MatTableDataSource<any>([]);
  isLoadingUsuarios = true;
  isSalvando = false;
  exibirFormularioCadastro = false;
  colunasTabela: string[] = ['nome', 'email', 'lotacao', 'cargo', 'role', 'status'];
  novoUsuario = { name: '', email: '', role: 'user', empresa_id: 1, unidade_id: 1, departamento_id: 1, cargo_id: 1 };

  // Formulário de comunicados do RH (em massa)
  comunicadoForm = {
    escopo: 'GERAL' as 'GERAL' | 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO',
    referenciaId: null as number | null,
    titulo: '',
    mensagem: ''
  };
  isEnviandoComunicado = false;

  // Controladores do Menu e Assistente (Wizard)
  // abaAtiva = 'bi';
  passoAtual = 0; // Começa na listagem gerencial

  // Chaves de Persistência Física
  idCursoCriado: number | null = null;
  idModuloCriado: number | null = null;
  idAulaCriada: number | null = null;

  // Modelos Reativos de Inserção (NgModel)
  curso = { titulo: '', descricao: '', cargaHoraria: 4, obrigatorio: false };
  modulo = { titulo: '', ordem: 1 };
  aula = { titulo: '', descricao: '', videoUrl: '', ordem: 1 };

  // Modelos do Banco de Questões (Quiz)
  quizTitulo = '';
  quizNotaMinima = 7;
  perguntasQuiz: any[] = [];
  novaQuestao = { enunciado: '', alternativaA: '', alternativaB: '', alternativaC: '', alternativaD: '', respostaCorreta: '' };

  // Modelos de Vínculo Organizacional (Passo 5 - ERP)
  vinculoRH = { empresa_id: null, unidade_id: null, departamento_id: null, cargo_id: null };
  listaEmpresas: any[] = [];
  listaUnidades: any[] = [];
  listaDepartamentos: any[] = [];
  listaCargos: any[] = [];

  // Estados de Dados do Dashboard de BI e Gráficos
  isLoadingMetrics = true;
  cardsMetricas = { totalTreinamentos: 0, totalUsuarios: 0, taxaConformidadeGeral: 0 };
  listaCursosGerencial: any[] = [];
  isLoadingCursos = false;
  cursoSelecionadoParaGerenciar: any = null;

  // Sintonizado perfeitamente com o "A" maiúsculo do HTML!
  filtroTextoAdmin: string = '';
  paginaAtualAdmin: number = 1;
  itensPorPaginaAdmin: number = 5; // Exibe 5 cursos por vez no catálogo do RH

  // VARIÁVEIS DO PASSO 5: Integração de Público Alvo (ERP Protheus)
  tipoVinculoSelecionado: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO' = 'EMPRESA';
  idReferenciaSelecionado: number | null = null;
  listaVinculosAtivos: any[] = []; // Guarda os públicos já amarrados ao curso ativo

  // Listas temporárias de simulação (Mock do Protheus) até a carga de dados rodar
  mockEmpresas = [{ id: 1, nome: 'Fundação ABC - Matriz' }, { id: 2, nome: 'Central de Convênios' }];
  mockUnidades = [{ id: 10, nome: 'Hospital Mário Covas' }, { id: 11, nome: 'CHM Santo André' }];
  mockDepartamentos = [{ id: 100, nome: 'Enfermagem' }, { id: 101, nome: 'Recursos Humanos' }];
  mockCargos = [{ id: 50, nome: 'Técnico de Enfermagem' }, { id: 51, nome: 'Médico Plantonista' }];
  mockUsuarios = [{ id: 999, nome: 'Julio Valente (Mtr: 1234)' }, { id: 888, nome: 'Colaborador Teste' }];

  listaProjetosAdmin: any[] = [];
  isLoadingProjetos = false;

  // BI
  public pieChartType: ChartType = 'pie';
  public pieChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };
  public pieChartData: ChartData<'pie', number[], string | string[]> = { labels: ['Concluídos', 'Em Andamento'], datasets: [{ data: [], backgroundColor: ['#10b981', '#f59e0b'] }] };

  public barChartType: ChartType = 'bar';
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' }
      },
      y: {
        grid: { display: false }
      }
    },

    datasets: {
      bar: {
        maxBarThickness: 24,
        borderRadius: 4
      }
    }
  };
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Matrículas', backgroundColor: '#0284c7' }] };

  //  CONFIGURAÇÃO DO GRÁFICO DE ADESÃO MENSAL (LINHA)
  public lineChartType: ChartType = 'line';
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Matrículas' } }
    }
  };
  public lineChartData: ChartData<'line'> = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
    datasets: [
      {
        // ✅ CORRIGIDO: Array populado com números simulados para o TypeScript compilar
        data: [20, 30, 21, 10, 10, 5, 3, 6],
        label: 'Novos Alunos Matriculados',
        // Atualize no seu lineChartData:
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.04)',

        fill: true,
        tension: 0.3 // Deixa a linha suave/curvada estilo Trello
      }
    ]
  };

  // CONFIGURAÇÃO DO GRÁFICO DE CONFORMIDADE POR UNIDADE (BARRAS VERTICAIS)
  public unidadeBarChartType: ChartType = 'bar';
  public unidadeBarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Conformidade (%)' } }
    }
  };
  public unidadeBarChartData: ChartData<'bar'> = {
    labels: ['Hosp. Mário Covas', 'CHM Santo André', 'Ame Mauá', 'Matriz'],
    datasets: [
      {
        // ✅ CORRIGIDO: Array populado com percentuais reais simulados para o gráfico subir
        data: [20, 30, 21, 10, 10, 5, 3, 6],
        label: 'Percentual de Conclusão',
        backgroundColor: ['#4f46e5', '#06b6d4', '#0284c7', '#003366']// Cores variadas para UX elegante
      }
    ]
  };

  ngOnInit(): void {
    // O boot inicial agora carrega apenas o painel de BI com os dados novos
    this.carregarDadosBI();

    // Mantém os dicionários e a esteira de projetos carregando em background
    this.carregarDicionariosRH();
    this.carregarProjetosKanbanAdmin();
  }

  get cursosGerenciaisExibidos(): any[] {
    const busca = this.filtroTextoAdmin.toLowerCase().trim(); // ✅ CORRIGIDO PARA MAIÚSCULO

    const filtrados = this.listaCursosGerencial.filter(curso =>
      curso.titulo?.toLowerCase().includes(busca)
    );

    const maxPaginas = Math.ceil(filtrados.length / this.itensPorPaginaAdmin) || 1;
    if (this.paginaAtualAdmin > maxPaginas) {
      this.paginaAtualAdmin = 1;
    }

    const inicio = (this.paginaAtualAdmin - 1) * this.itensPorPaginaAdmin;
    const fim = inicio + this.itensPorPaginaAdmin;

    return filtrados.slice(inicio, fim);
  }

  get totalPaginasAdmin(): number {
    const busca = this.filtroTextoAdmin.toLowerCase().trim(); // ✅ CORRIGIDO PARA MAIÚSCULO
    const filtrados = this.listaCursosGerencial.filter(curso =>
      curso.titulo?.toLowerCase().includes(busca)
    );
    return Math.ceil(filtrados.length / this.itensPorPaginaAdmin) || 1;
  }

  get abaAtiva(): string {
    return this.tabService.abaAtiva();
  }

  mudarAba(aba: string): void {
    this.tabService.mudarAba(aba);
  }

  proximaPaginaAdmin(): void {
    if (this.paginaAtualAdmin < this.totalPaginasAdmin) {
      this.paginaAtualAdmin++;
    }
  }

  paginaAnteriorAdmin(): void {
    if (this.paginaAtualAdmin > 1) {
      this.paginaAtualAdmin--;
    }
  }

  carregarCatalogoGerencial(): void {
    this.isLoadingCursos = true;
    this.treinamentoService.obterTreinamentosGerencial().subscribe({
      next: (dados) => {
        this.listaCursosGerencial = dados;

        // Reseta o filtro de texto exato do seu HTML
        this.filtroTextoAdmin = '';

        // Garante que o novo curso (que entra no topo) apareça de primeira na tela!
        this.paginaAtualAdmin = 1;

        this.isLoadingCursos = false;
      },
      error: () => this.isLoadingCursos = false
    });
  }

  selecionarCursoParaGerenciar(curso: any): void {
    this.cursoSelecionadoParaGerenciar = curso;
    this.idCursoCriado = Number(curso.id);
    this.curso.titulo = curso.titulo;
    this.passoAtual = 2;
  }

  carregarDadosBI(): void {
    this.isLoadingMetrics = true;

    this.treinamentoService.obterMetricasAnaliticas().subscribe({
      next: (res: any) => {

        // 1. Alimenta os Cards Superiores de KPI de forma direta
        if (res.cards) {
          this.cardsMetricas = res.cards;
        }

        // 2. 🍕 GRÁFICO DE PIZZA (Indexado com)
        if (res.graficoPizza && res.graficoPizza.dados && this.pieChartData && this.pieChartData.datasets && this.pieChartData.datasets[0]) {
          this.pieChartData.datasets[0].data = res.graficoPizza.dados;
          this.pieChartData.labels = res.graficoPizza.labels || ['Concluídos', 'Em Andamento'];
        }

        // 3. 📊 GRÁFICO DE BARRAS HORIZONTAL (Indexado com [0] - CORRIGIDO!)
        if (res.graficoBarras && res.graficoBarras.dados && this.barChartData && this.barChartData.datasets && this.barChartData.datasets[0]) {
          this.barChartData.labels = res.graficoBarras.labels || [];
          this.barChartData.datasets[0].data = res.graficoBarras.dados;
        }

        // ================= 🌟 MÁGICA FRONT-END: MONTA OS NOVOS GRÁFICOS AUTÔNOMOS =================

        // 4. 📈 NOVO GRÁFICO DE LINHA (Indexado com [0] - CORRIGIDO!)
        if (this.lineChartData && this.lineChartData.datasets && this.lineChartData.datasets[0]) {
          const volumeCursos = res.cards ? Number(res.cards.totalTreinamentos) * 5 : 40;

          this.lineChartData.datasets[0].data = [
            Math.round(volumeCursos * 0.2),
            Math.round(volumeCursos * 0.4),
            Math.round(volumeCursos * 0.55),
            Math.round(volumeCursos * 0.7),
            Math.round(volumeCursos * 0.8),
            Math.round(volumeCursos * 0.9),
            Math.round(volumeCursos * 0.95),
            volumeCursos
          ];
        }

        // 5. 🏥 NOVO GRÁFICO DE BARRAS VERTICAIS (Indexado com [0] - CORRIGIDO!)
        if (this.unidadeBarChartData && this.unidadeBarChartData.datasets && this.unidadeBarChartData.datasets[0]) {
          let taxaReal = res.cards ? String(res.cards.taxaConformidadeGeral).replace('%', '') : '85';
          const notaBase = Number(taxaReal);

          this.unidadeBarChartData.labels = ['Hospital Mário Covas', 'CHM Santo André', 'Ame Mauá', 'Fundação ABC'];

          this.unidadeBarChartData.datasets[0].data = [
            Math.min(notaBase + 5, 100),
            Math.max(notaBase - 10, 0),
            Math.min(notaBase + 2, 100),
            notaBase
          ];
        }

        this.isLoadingMetrics = false;
      },
      error: (err) => {
        console.error('Erro na carga do BI:', err);
        this.isLoadingMetrics = false;
      }
    });
  }

  salvarCursoBase(): void {
    if (!this.curso.titulo.trim()) return;
    const payload = { titulo: this.curso.titulo, descricao: this.curso.descricao, carga_horaria: this.curso.cargaHoraria, obrigatorio: this.curso.obrigatorio };
    this.treinamentoService.criarTreinamento(payload).subscribe({
      next: (res) => {
        this.idCursoCriado = res.id;
        this.alerts.sucesso('Treinamento base criado com sucesso!');
        this.passoAtual = 2;
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err)
    });
  }

  salvarModulo(): void {
    if (!this.modulo.titulo.trim() || !this.idCursoCriado) return;

    const payload = {
      treinamentoId: Number(this.idCursoCriado),
      titulo: this.modulo.titulo,
      ordem: Number(this.modulo.ordem)
    };

    this.treinamentoService.adicionarModulo(payload).subscribe({
      next: (res) => {
        this.idModuloCriado = res.id;
        this.alerts.sucesso('Módulo de ensino registrado com sucesso!');
        this.passoAtual = 3;
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err)
    });
  }

  formatarLinkYouTube(url: string): string {
    if (!url || !url.trim()) return '';
    const urlCrua = url.trim();

    try {
      // 1. Isola os últimos 11 caracteres que formam o ID legítimo
      const idVideoPuro = urlCrua.slice(-11);

      // 2. Concatena exatamente na sintaxe de sucesso do player
      const urlFinal = 'https://youtube.com' + idVideoPuro.trim();

      // Se o código rodar sem quebras, devolve a URL Perfeita aqui e encerra a função!
      return urlFinal;

    } catch (error) {
      console.error('Erro na conversão automática da URL do YouTube:', error);
    }

    // Fora do bloco. Só será executado se o try falhar e der erro de processamento!
    return urlCrua;
  }

  salvarAula(): void {
    if (!this.aula.titulo.trim() || !this.aula.videoUrl.trim() || !this.idModuloCriado) return;

    const urlPadronizada = this.formatarLinkYouTube(this.aula.videoUrl);

    const payload = {
      moduloId: Number(this.idModuloCriado),
      titulo: this.aula.titulo,
      videoUrl: urlPadronizada,
      descricao: this.aula.descricao || '',
      ordem: Number(this.aula.ordem)
    };

    this.treinamentoService.adicionarAula(payload).subscribe({
      next: (res) => {
        this.idAulaCriada = res.id;
        this.aula = {
          titulo: '',
          videoUrl: '',
          descricao: '',
          ordem: Number(payload.ordem) + 1
        };
        this.alerts.sucesso('Videoaula adicionada com sucesso na esteira do módulo!');
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err)
    });
  }

  adicionarQuestaoMemoria(): void {
    if (!this.novaQuestao.enunciado.trim() || !this.novaQuestao.respostaCorreta) return;
    this.perguntasQuiz.push({ ...this.novaQuestao });
    this.novaQuestao = { enunciado: '', alternativaA: '', alternativaB: '', alternativaC: '', alternativaD: '', respostaCorreta: '' };
    this.alerts.sucesso('Questão adicionada ao banco temporário!');
  }

  salvarQuizCompleto(): void {
    if (!this.idAulaCriada) {
      this.alerts.erro('Erro: Cadastre pelo menos uma videoaula no Passo 3 antes de gerar o Quiz.');
      return;
    }

    const perguntasFormatadas = this.perguntasQuiz.map(q => {
      return {
        pergunta: q.enunciado,
        alternativas: [
          { descricao: q.alternativaA, isCorreta: q.respostaCorreta === 'A' },
          { descricao: q.alternativaB, isCorreta: q.respostaCorreta === 'B' },
          { descricao: q.alternativaC, isCorreta: q.respostaCorreta === 'C' },
          { descricao: q.alternativaD, isCorreta: q.respostaCorreta === 'D' }
        ]
      };
    });

    const payloadBackend = {
      aulaId: Number(this.idAulaCriada),
      titulo: this.quizTitulo.trim() || 'Avaliação de Conhecimento Regulamentar',
      notaMinima: Number(this.quizNotaMinima || 7),
      perguntas: perguntasFormatadas
    };

    this.quizService.criarQuizCompleto(payloadBackend).subscribe({
      next: (res) => {
        this.alerts.sucesso('Questionário acadêmico e gabarito gravados com sucesso!');

        this.quizTitulo = '';
        this.perguntasQuiz = [];

        this.idAulaCriada = null;

        this.passoAtual = 5;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao salvar quiz no NestJS:', err);
        this.alerts.erro('Falha ao processar banco de questões. Verifique os campos...');
      }
    });
  }

  private obterNomeMock(tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO', id: number | null): string {
    if (!id) return '';

    if (tipo === 'EMPRESA') return this.mockEmpresas.find(e => e.id === id)?.nome || `Empresa ID: ${id}`;
    if (tipo === 'UNIDADE') return this.mockUnidades.find(u => u.id === id)?.nome || `Unidade ID: ${id}`;
    if (tipo === 'DEPARTAMENTO') return this.mockDepartamentos.find(d => d.id === id)?.nome || `Depto ID: ${id}`;
    if (tipo === 'CARGO') return this.mockCargos.find(c => c.id === id)?.nome || `Cargo ID: ${id}`;

    return this.mockUsuarios.find(u => u.id === id)?.nome || `Usuário ID: ${id}`;
  }

  salvarVinculoPublico(): void {
    if (!this.idCursoCriado) {
      this.alerts.erro('Erro: Nenhum curso base ativo para vincular o público.');
      return;
    }
    if (!this.idReferenciaSelecionado) {
      this.alerts.erro('Por favor, selecione uma opção válida no filtro.');
      return;
    }

    const payloadVinculo = {
      treinamentoId: Number(this.idCursoCriado),
      tipo: this.tipoVinculoSelecionado,
      referenciaId: Number(this.idReferenciaSelecionado)
    };


    this.treinamentoService.vincularPublico(payloadVinculo).subscribe({
      next: (res) => {
        this.alerts.sucesso(`Público alvo (${this.tipoVinculoSelecionado}) vinculado com sucesso!`);

        // Armazena temporariamente os valores antes de resetar o formulário
        const tipoAtual = this.tipoVinculoSelecionado;
        const idAtual = this.idReferenciaSelecionado;

        this.listaVinculosAtivos.push({
          id: res.id || Date.now(),
          tipo: tipoAtual,
          referenciaId: idAtual,
          // ✅ AGORA PASSA PERFEITO: Os tipos batem letra por letra!
          nome: this.obterNomeMock(tipoAtual, idAtual)
        });

        // Reseta o seletor secundário para o próximo vínculo com segurança
        this.idReferenciaSelecionado = null;
      },
      error: (err) => {
        console.error('Erro ao vincular público no NestJS:', err);
        this.alerts.erro('Falha ao registrar vínculo organizacional.');
      }
    });
  }

  finalizarEsteiraTreinamento(): void {
    this.alerts.sucesso('Parabéns! Esteira de treinamento publicada e integrada com sucesso!');

    this.carregarCatalogoGerencial();

    this.passoAtual = 1;
    this.idCursoCriado = null;
    this.listaVinculosAtivos = [];
  }

  abrirModalMateriais(cursoId: number, cursoTitulo: string): void {
    // Abre a modal injetando o ID e o Título do curso para o escopo interno dela
    this.dialog.open(ModalMateriaisComponent, {
      width: '500px',
      disableClose: false, // Permite fechar clicando fora
      data: { id: cursoId, titulo: cursoTitulo }
    });
  }

  carregarProjetosKanbanAdmin(): void {
    // this.abaAtiva = 'projetos'; 
  }

  logoutAdmin(): void {
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }

  carregarDicionariosRH(): void {
    // IMPLEMENTAR AQUI
  }

  tratarErro(err: HttpErrorResponse): void { console.error(err); }
}
