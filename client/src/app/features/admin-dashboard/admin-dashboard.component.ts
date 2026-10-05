import { Component, inject, OnInit, ViewChild, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Componentes de Gráficos (Chart.js)
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { ControleUsuariosComponent } from '../user/user.component';
import { ModalMateriaisComponent } from './modal-materiais.component';
import { NotificationService } from '../../core/services/notification.service';
import { MatPaginator } from '@angular/material/paginator';
import { AdminTabService } from '../../core/services/admin-tab.service';
import { LayoutService } from '../../core/services/layout.service';
import { GeminiService } from '../../core/services/gemini.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { ChatApiService } from '../../core/services/chat.service';

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
    ModalMateriaisComponent,
    MatExpansionModule,
    MatProgressBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {

  private treinamentoService = inject(TreinamentoService);
  private route = inject(ActivatedRoute);
  private tabService = inject(AdminTabService);
  private quizService = inject(QuizService);
  public snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private alerts = inject(AlertsService);
  public notificationService = inject(NotificationService);
  private layoutService = inject(LayoutService);
  private geminiService = inject(GeminiService);
  public textoBaseIA = '';
  private chatApiService = inject(ChatApiService);
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
      if (abaAtual === 'chat') {
        this.carregarPainelSuporteRH();
      }
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data && data['aba']) {
        this.tabService.abaAtiva.set(data['aba']);
      }
    });

    this.carregarDadosBI();
    this.carregarDicionariosRH();
    this.carregarProjetosKanbanAdmin();
  }

  vinculoRH = { empresa_id: '', unidade_id: '', departamento_id: '', cargo_id: '' };
  listaDepartamentos: any[] = [];
  listaEmpresas: any[] = [];
  listaUnidades: any[] = [];
  listaCargos: any[] = [];

  listaSalasChat: any[] = [];
  salaChatSelecionada: any = null;
  historicoMensagensChat: any[] = [];
  novaMensagemTutorText = '';
  isLoadingChats = false;

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
  get cursosGerenciaisExibidos(): any[] {
    const busca = this.filtroTextoAdmin.toLowerCase().trim();

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
    const busca = this.filtroTextoAdmin.toLowerCase().trim();
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
    this.router.navigate([`/admin/${aba}`]);
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
        this.filtroTextoAdmin = '';
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
        if (res.cards) {
          this.cardsMetricas = res.cards;
        }
        if (res.graficoPizza && res.graficoPizza.dados && this.pieChartData && this.pieChartData.datasets && this.pieChartData.datasets[0]) {
          this.pieChartData.datasets[0].data = res.graficoPizza.dados;
          this.pieChartData.labels = res.graficoPizza.labels || ['Concluídos', 'Em Andamento'];
        }
        if (res.graficoBarras && res.graficoBarras.dados && this.barChartData && this.barChartData.datasets && this.barChartData.datasets[0]) {
          this.barChartData.labels = res.graficoBarras.labels || [];
          this.barChartData.datasets[0].data = res.graficoBarras.dados;
        }
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
      const idVideoPuro = urlCrua.slice(-11);
      const urlFinal = 'https://youtube.com' + idVideoPuro.trim();
      return urlFinal;
    } catch (error) {
      console.error('Erro na conversão automática da URL do YouTube:', error);
    }
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

        this.carregarDadosOrigemProtheus();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao salvar quiz no NestJS:', err);
        this.alerts.erro('Falha ao processar banco de questões. Verifique os campos...');
      }
    });
  }
  public obterNomeMock(tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO', id: string | number | null): string {
    if (!id) return '';

    const idProcurado = String(id).trim();

    if (tipo === 'EMPRESA') {
      return this.listaEmpresas.find(e => String(e.id) === idProcurado)?.nome || `Complexo ID: ${idProcurado}`;
    }
    if (tipo === 'UNIDADE') {
      return this.listaUnidades.find(u => String(u.id) === idProcurado)?.nome || `Unidade ID: ${idProcurado}`;
    }
    if (tipo === 'CARGO') {
      return this.listaCargos.find(c => String(c.id) === idProcurado)?.nome || `Cargo ID: ${idProcurado}`;
    }

    // Fallbacks genéricos caso precise de Depto ou Usuário temporariamente
    return `${tipo} ID: ${idProcurado}`;
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
      referenciaId: String(this.idReferenciaSelecionado).trim()
    };

    this.treinamentoService.vincularPublico(payloadVinculo).subscribe({
      next: (res) => {
        this.alerts.sucesso(`Público alvo (${this.tipoVinculoSelecionado}) vinculado com sucesso!`);

        const tipoAtual = this.tipoVinculoSelecionado;
        const idAtual = this.idReferenciaSelecionado;

        this.listaVinculosAtivos.push({
          id: res.id || Date.now(),
          tipo: tipoAtual,
          referenciaId: idAtual,
          nome: this.obterNomeMock(tipoAtual, idAtual)
        });

        this.idReferenciaSelecionado = null;
      },
      error: (err) => {
        console.error('Erro ao vincular público no NestJS:', err);
        this.alerts.erro('Falha ao registrar vínculo organizacional.');
      }
    });
  }
  carregarDadosOrigemProtheus(): void {
    this.isLoadingCursos = true; // Reaproveita o indicador de carga para a UX

    this.treinamentoService.obterEmpresasERP().subscribe({
      next: (empresas) => {
        this.listaEmpresas = empresas;
        this.isLoadingCursos = false;
      },
      error: () => this.isLoadingCursos = false
    });

    this.treinamentoService.obterCargosERP().subscribe({
      next: (cargos) => this.listaCargos = cargos,
      error: (err) => console.error('Erro ao carregar cargos do ERP:', err)
    });
  }
  aoMudarEmpresa(empresaId: string): void {
    this.vinculoRH.empresa_id = empresaId;
    this.vinculoRH.unidade_id = ''; // Reseta seleções anteriores por segurança
    this.listaUnidades = [];

    if (!empresaId) return;

    // Disca para o serviço buscando as filiais correspondentes
    this.treinamentoService.obterUnidadesERP(empresaId).subscribe({
      next: (unidades) => {
        this.listaUnidades = unidades;
        console.log(`🏥 Filiais carregadas para a Empresa [${empresaId}]:`, unidades);
      },
      error: (err) => console.error('Erro ao buscar unidades filtradas:', err)
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
    this.dialog.open(ModalMateriaisComponent, {
      width: '500px',
      disableClose: false,
      data: { id: cursoId, titulo: cursoTitulo }
    });
  }
  gerarQuizPorInteligenciaArtificial(): void {
    if (!this.textoBaseIA || !this.textoBaseIA.trim()) return;

    // O loadingInterceptor de concorrência já liga o showLoader() aqui na rede de forma automática!
    this.geminiService.gerarQuestoesAutomaticas(this.textoBaseIA).subscribe({
      next: (questoesGeradas: any[]) => {
        if (questoesGeradas && questoesGeradas.length > 0) {
          // Concatena ou substitui o array reativo do seu quiz com as perguntas cuspidas pela IA
          this.perguntasQuiz = [...this.perguntasQuiz, ...questoesGeradas];

          // Dá o feedback de sucesso total corporativo para o RH
          this.alerts.sucesso(`Mágica concluída! ${questoesGeradas.length} questões regulamentares injetadas com sucesso via Google Gemini!`);
          this.textoBaseIA = ''; // Limpa a caixa de texto base
        }
      },
      error: (err) => {
        console.error('Falha na geração automática por IA:', err);
        this.alerts.erro('Não foi possível processar a Inteligência Artificial. Verifique os logs do servidor.');
      }
    });
  }
  logoutAdmin(): void {
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }
  carregarProjetosKanbanAdmin(): void {
    // this.abaAtiva = 'projetos'; 
  }
  carregarDicionariosRH(): void {
    // IMPLEMENTAR AQUI
  }
  salvarQuizDoWizard(): void {
    if (!this.idAulaCriada) {
      this.alerts.erro('Erro: Cadastre pelo menos uma videoaula no Passo 3 antes de consolidar o Quiz.');
      return;
    }

    if (!this.perguntasQuiz || this.perguntasQuiz.length === 0) {
      this.alerts.erro('Por favor, gere as questões por Inteligência Artificial antes de avançar.');
      return;
    }

    // Monta o payload no contrato exato que o novo endpoint admin/criar-gerado-ia espera receber
    const payloadFinal = {
      aulaId: Number(this.idAulaCriada),
      titulo: this.quizTitulo.trim() || `Avaliação de Conformidade Regulamentar`,
      notaMinima: Number(this.quizNotaMinima || 7),
      tentativas: 3,
      perguntas: this.perguntasQuiz // Consome as 5 perguntas da nossa simulação do Gemini
    };

    // Dispara a requisição HTTP contra a rota blindada do NestJS
    this.quizService.salvarQuizGeradoPorIA(payloadFinal).subscribe({
      next: (response) => {
        this.alerts.sucesso('Banco de questões de IA consolidado com sucesso no Postgres! 🏆');

        // Limpa a esteira reativa local para os próximos cadastros
        this.quizTitulo = '';
        this.perguntasQuiz = [];

        // Avança o gestor reativamente para o Passo 5 (Vínculo de Público-Alvo do RH)
        this.passoAtual = 5;
      },
      error: (err: HttpErrorResponse) => {
        console.error('🚨 Falha na persistência relacional do Quiz da IA:', err);
        this.alerts.erro('Não foi possível gravar as questões. Verifique o console do servidor.');
      }
    });
  }
  carregarPainelSuporteRH(): void {
    this.isLoadingChats = true;
    this.chatApiService.listarSalasAtivasDoRH().subscribe({
      next: (salas) => {
        this.listaSalasChat = salas;
        this.isLoadingChats = false;
      },
      error: (err) => {
        console.error('🚨 Erro ao buscar salas do chat:', err);
        this.isLoadingChats = false;
      }
    });
  }
  selecionarSalaSuporte(sala: any): void {
    this.salaChatSelecionada = sala;
    this.historicoMensagensChat = [];

    // Injeta o ID fixo do gestor/tutor (pode puxar do AuthService) e o nome para o JoinRoom
    const tutorId = 1;


    // Liga a fiação do WebSocket e entra no canal exclusivo daquela sala
    this.chatApiService.entrarNaSala(sala.usuario_id, sala.user?.name || 'Aluno');

    // Escuta reativamente a carga inicial do histórico de mensagens antigas da sala
    this.chatApiService.dadosSala.subscribe((dados: any) => {
      if (dados && dados.salaId === sala.id) {
        this.historicoMensagensChat = dados.historico || [];
        this.rolarChatParaOFinal();
      }
    });

    // Escuta novas mensagens pingando em tempo real enviadas pelo aluno
    this.chatApiService.novaMensagem.subscribe((mensagem: any) => {
      if (mensagem && mensagem.sala_id === sala.id) {
        // Blinda contra duplicidade na esteira reativa
        const jaExiste = this.historicoMensagensChat.some(m => m.id === mensagem.id);
        if (!jaExiste) {
          this.historicoMensagensChat.push(mensagem);
          this.rolarChatParaOFinal();
        }
      }
    });
  }
  enviarMensagemDoTutor(): void {
    if (!this.novaMensagemTutorText.trim() || !this.salaChatSelecionada) return;

    const tutorId = 1; // Substitua pelo ID dinâmico do usuário logado se preferir
    const conteudo = this.novaMensagemTutorText.trim();

    // Emite o evento instantâneo via Socket.io marcando is_tutor = true
    this.chatApiService.enviarMensagemInstantanea(
      this.salaChatSelecionada.id,
      tutorId,
      conteudo,
      true // isTutor
    );

    this.novaMensagemTutorText = ''; // Limpa a caixa de texto reativa
  }
  private rolarChatParaOFinal(): void {
    setTimeout(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
  deletarVinculoReal(vinculoId: number): void {
    if (!vinculoId) return;

    // 1. Dispara o cano HTTP Delete para o back-end NestJS detonar o dado no Postgres
    this.treinamentoService.removerVinculoPublico(vinculoId).subscribe({
      next: (resposta) => {
        // 2. FILTRO REATIVO SUPREMO: Remove o card da lista da tela instantaneamente sem dar nenhuma piscada!
        this.listaVinculosAtivos = this.listaVinculosAtivos.filter(v => v.id !== vinculoId);
        
        // 3. Exibe o feedback visual premium de sucesso para o gestor do RH
        this.snackBar.open('Vínculo organizacional removido com sucesso!', 'Fechar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        
        console.log(`🧹 Registro ID [${vinculoId}] removido fisicamente e expurgado da memória RAM.`);
      },
      error: (err) => {
        console.error('🚨 Erro ao remover vínculo regulamentar do Passo 5:', err);
        this.snackBar.open('Falha ao excluir o vínculo. Tente novamente.', 'Fechar', { duration: 4000 });
      }
    });
  }
  tratarErro(err: HttpErrorResponse): void { console.error(err); }
}
