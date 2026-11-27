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
import { ThemeService } from '../../core/services/theme.service';

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
import { Chart, registerables, ChartConfiguration, ChartData } from 'chart.js';
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
  public themeService = inject(ThemeService);

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

    // Atualiza automaticamente as cores dos 4 gráficos ao alternar entre Sol e Lua
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.atualizarCoresGraficos(isDark);
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

  listaUsuarios: any[] = [];

  userDataSource = new MatTableDataSource<any>([]);
  isLoadingUsuarios = true;
  isSalvando = false;
  exibirFormularioCadastro = false;
  colunasTabela: string[] = ['nome', 'email', 'lotacao', 'cargo', 'role', 'status'];
  novoUsuario = { name: '', email: '', role: 'user', empresa_id: 1, unidade_id: 1, departamento_id: 1, cargo_id: 1 };

  comunicadoForm = {
    escopo: 'GERAL' as 'GERAL' | 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO',
    referenciaId: null as number | null,
    titulo: '',
    mensagem: ''
  };
  isEnviandoComunicado = false;

  passoAtual = 0;

  idCursoCriado: number | null = null;
  idModuloCriado: number | null = null;
  idAulaCriada: number | null = null;

  curso = { titulo: '', descricao: '', cargaHoraria: 4, obrigatorio: false };
  modulo = { titulo: '', ordem: 1 };
  aula = { titulo: '', descricao: '', videoUrl: '', ordem: 1 };

  quizTitulo = '';
  quizNotaMinima = 7;
  perguntasQuiz: any[] = [];
  novaQuestao = { enunciado: '', alternativaA: '', alternativaB: '', alternativaC: '', alternativaD: '', respostaCorreta: '' };

  isLoadingMetrics = true;
  cardsMetricas = { totalTreinamentos: 0, totalUsuarios: 0, taxaConformidadeGeral: 0 };
  listaCursosGerencial: any[] = [];
  isLoadingCursos = false;
  cursoSelecionadoParaGerenciar: any = null;

  modulosDoCursoEdicao: any[] = [];
  aulasDoModuloEdicao: any[] = [];
  editandoModuloExistente = false;
  editandoAulaExistente = false;
  indiceQuestaoEmEdicao: number | null = null;


  filtroTextoAdmin: string = '';
  paginaAtualAdmin: number = 1;
  itensPorPaginaAdmin: number = 5;

  tipoVinculoSelecionado: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO' = 'EMPRESA';
  idReferenciaSelecionado: number | null = null;
  listaVinculosAtivos: any[] = [];

  listaProjetosAdmin: any[] = [];
  isLoadingProjetos = false;

  public pieChartType = 'pie' as const;
  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    }
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Concluídos', 'Em Andamento', 'Reprovados'],
    datasets: [{
      data: [],
      backgroundColor: ['#10b981', '#f59e0b', '#f50b55']
    }]
  };

  public barChartType = 'bar' as const;
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
      y: { grid: { display: false } }
    },
    datasets: {
      bar: { maxBarThickness: 24, borderRadius: 4 }
    }
  };
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Matrículas', backgroundColor: '#0284c7' }]
  };

  public lineChartType = 'line' as const;
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Matrículas' } }
    }
  };
  public lineChartData: ChartData<'line'> = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    datasets: [
      {
        data: Array(12).fill(0),
        label: 'Novos Alunos Matriculados',
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.04)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  public unidadeBarChartType = 'bar' as const;
  public unidadeBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Conformidade (%)' } }
    }
  };
  public unidadeBarChartData: ChartData<'bar'> = {
    labels: ['Hosp. Mário Covas', 'CHM Santo André', 'Ame Mauá', 'Matriz'],
    datasets: [
      {
        data: [20, 30, 21, 10, 10, 5, 3, 6],
        label: 'Percentual de Conclusão',
        backgroundColor: ['#4f46e5', '#06b6d4', '#0284c7', '#003366']
      }
    ]
  };

  private atualizarCoresGraficos(isDark: boolean): void {
    const corTexto = isDark ? '#cbd5e1' : '#475569';
    const corGrade = isDark ? 'rgba(148, 163, 184, 0.14)' : '#f1f5f9';

    this.pieChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: corTexto, font: { weight: 'bold' } }
        }
      }
    };

    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: corGrade },
          ticks: { color: corTexto }
        },
        y: {
          grid: { display: false },
          ticks: { color: corTexto }
        }
      },
      datasets: {
        bar: { maxBarThickness: 24, borderRadius: 4 }
      }
    };

    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: corTexto }
        }
      },
      scales: {
        x: {
          grid: { color: corGrade },
          ticks: { color: corTexto }
        },
        y: {
          beginAtZero: true,
          grid: { color: corGrade },
          ticks: { color: corTexto },
          title: { display: true, text: 'Matrículas', color: corTexto }
        }
      }
    };

    this.unidadeBarChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: corTexto }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: corGrade },
          ticks: { color: corTexto },
          title: { display: true, text: 'Conformidade (%)', color: corTexto }
        }
      }
    };
  }


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

  modoVisualizacaoCatalogo: 'cards' | 'lista' =
    (localStorage.getItem('ava_catalogo_admin_view') as 'cards' | 'lista') || 'cards';

  alterarModoVisualizacaoCatalogo(modo: 'cards' | 'lista'): void {
    this.modoVisualizacaoCatalogo = modo;
    localStorage.setItem('ava_catalogo_admin_view', modo);
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

  carregarDadosBI(): void {
    this.isLoadingMetrics = true;

    this.treinamentoService.obterMetricasAnaliticas().subscribe({
      next: (res: any) => {
        if (res.cards) {
          this.cardsMetricas = res.cards;
        }

        if (res.graficoPizza && res.graficoPizza.dados && this.pieChartData?.datasets?.[0]) {
          this.pieChartData.datasets[0].data = res.graficoPizza.dados;
          this.pieChartData.labels = res.graficoPizza.labels || ['Concluídos', 'Em Andamento', 'Reprovados'];
        }

        if (res.graficoBarras && res.graficoBarras.dados && this.barChartData?.datasets?.[0]) {
          this.barChartData.labels = res.graficoBarras.labels || [];
          this.barChartData.datasets[0].data = res.graficoBarras.dados;
        }

        if (res.graficoLinhaMatriculas && this.lineChartData?.datasets?.[0]) {
          this.lineChartData.datasets[0].data = res.graficoLinhaMatriculas;
        }

        if (res.graficoBarrasUnidades && this.unidadeBarChartData?.datasets?.[0]) {
          this.unidadeBarChartData.labels = res.graficoBarrasUnidades.labels || [];
          this.unidadeBarChartData.datasets[0].data = res.graficoBarrasUnidades.valores || [];
        }

        this.pieChartData = { ...this.pieChartData };
        this.barChartData = { ...this.barChartData };
        this.lineChartData = { ...this.lineChartData };
        this.unidadeBarChartData = { ...this.unidadeBarChartData };

        this.isLoadingMetrics = false;
      },
      error: (err) => {
        console.error('Falha na carga do barramento do BI Analítico:', err);
        this.isLoadingMetrics = false;
      }
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

    if (this.editandoAulaExistente && this.idAulaCriada) {
      this.treinamentoService
        .atualizarAula(this.idAulaCriada, {
          titulo: this.aula.titulo,
          videoUrl: urlPadronizada,
          descricao: this.aula.descricao || '',
          ordem: Number(this.aula.ordem),
        })
        .subscribe({
          next: (res) => {
            const aulaAtualizada = res?.data || res;
            const idx = this.aulasDoModuloEdicao.findIndex((a) => Number(a.id) === Number(this.idAulaCriada));
            if (idx >= 0) {
              this.aulasDoModuloEdicao = this.aulasDoModuloEdicao.map((item, i) =>
                i === idx ? { ...item, ...aulaAtualizada } : item
              );
            }
            this.alerts.sucesso('Videoaula atualizada com sucesso!');
          },
          error: (err: HttpErrorResponse) => {
            this.tratarErro(err);
            this.alerts.erro(err.error?.message || 'Erro ao atualizar a videoaula.');
          },
        });
      return;
    }

    const payload = {
      moduloId: Number(this.idModuloCriado),
      titulo: this.aula.titulo,
      videoUrl: urlPadronizada,
      descricao: this.aula.descricao || '',
      ordem: Number(this.aula.ordem),
    };

    this.treinamentoService.adicionarAula(payload).subscribe({
      next: (res) => {
        const aulaCriada = res?.data || res;
        this.idAulaCriada = Number(aulaCriada.id);
        this.aulasDoModuloEdicao = [...this.aulasDoModuloEdicao, aulaCriada];
        this.editandoAulaExistente = false;
        this.aula = {
          titulo: '',
          videoUrl: '',
          descricao: '',
          ordem: this.aulasDoModuloEdicao.length + 1,
        };
        this.alerts.sucesso('Videoaula adicionada com sucesso na esteira do módulo!');
      },
      error: (err: HttpErrorResponse) => {
        this.tratarErro(err);
        this.alerts.erro(err.error?.message || 'Erro ao gravar a videoaula.');
      },
    });
  }

  private chatDadosSub: any;
  private chatMensagemSub: any;

  private obterIdTutorLogado(): number {
    try {
      const rawUser = localStorage.getItem('usuario') || localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const id = Number(parsed.id || parsed.usuario_id || parsed.sub);
        if (id && !isNaN(id)) return id;
      }

      const token = localStorage.getItem('accessToken');
      if (token && token.split('.').length === 3) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const id = Number(payload.sub || payload.id || payload.usuario_id);
        if (id && !isNaN(id)) return id;
      }
    } catch (e) {
      console.warn('Erro ao ler ID do tutor logado:', e);
    }
    return Number(localStorage.getItem('userId') || 0);
  }

  iniciarNovoCadastroCurso(): void {
    this.cursoSelecionadoParaGerenciar = null;
    this.idCursoCriado = null;
    this.idModuloCriado = null;
    this.idAulaCriada = null;
    this.modulosDoCursoEdicao = [];
    this.aulasDoModuloEdicao = [];
    this.editandoModuloExistente = false;
    this.editandoAulaExistente = false;
    this.indiceQuestaoEmEdicao = null;
    this.curso = { titulo: '', descricao: '', cargaHoraria: 4, obrigatorio: false };
    this.modulo = { titulo: '', ordem: 1 };
    this.aula = { titulo: '', descricao: '', videoUrl: '', ordem: 1 };
    this.quizTitulo = '';
    this.quizNotaMinima = 7;
    this.perguntasQuiz = [];
    this.listaVinculosAtivos = [];
    this.passoAtual = 1;
  }

  selecionarCursoParaGerenciar(cursoItem: any): void {
    this.isLoadingCursos = true;
    this.treinamentoService.obterConteudoCurso(Number(cursoItem.id)).subscribe({
      next: (cursoCompleto) => {
        this.cursoSelecionadoParaGerenciar = cursoCompleto;
        this.idCursoCriado = Number(cursoCompleto.id);
        this.curso = {
          titulo: cursoCompleto.titulo || '',
          descricao: cursoCompleto.descricao || '',
          cargaHoraria: Number(cursoCompleto.carga_horaria || 4),
          obrigatorio: Boolean(cursoCompleto.obrigatorio),
        };

        this.modulosDoCursoEdicao = cursoCompleto.modulos || [];
        if (this.modulosDoCursoEdicao.length > 0) {
          this.selecionarModuloParaEditar(this.modulosDoCursoEdicao[0]);
        } else {
          this.idModuloCriado = null;
          this.editandoModuloExistente = false;
          this.modulo = { titulo: '', ordem: 1 };
          this.aulasDoModuloEdicao = [];
          this.idAulaCriada = null;
          this.editandoAulaExistente = false;
          this.aula = { titulo: '', descricao: '', videoUrl: '', ordem: 1 };
          this.perguntasQuiz = [];
        }

        this.carregarDadosOrigemProtheus();
        this.listaVinculosAtivos = (cursoCompleto.publicos || []).map((v: any) => ({
          id: v.id,
          tipo: v.tipo,
          referenciaId: v.referencia_id,
          nome: this.obterNomeMock(v.tipo, v.referencia_id),
        }));

        this.passoAtual = 1;
        this.isLoadingCursos = false;
      },
      error: (err) => {
        this.isLoadingCursos = false;
        this.tratarErro(err);
        this.alerts.erro('Não foi possível carregar os dados completos deste curso para edição.');
      },
    });
  }

  selecionarModuloParaEditar(mod: any): void {
    this.idModuloCriado = Number(mod.id);
    this.editandoModuloExistente = true;
    this.modulo = {
      titulo: mod.titulo || '',
      ordem: Number(mod.ordem || 1),
    };
    this.aulasDoModuloEdicao = mod.aulas || [];
    if (this.aulasDoModuloEdicao.length > 0) {
      this.selecionarAulaParaEditar(this.aulasDoModuloEdicao[0]);
    } else {
      this.prepararNovaAulaNoModulo();
    }
  }

  prepararNovoModuloNoCurso(): void {
    this.idModuloCriado = null;
    this.editandoModuloExistente = false;
    this.modulo = { titulo: '', ordem: this.modulosDoCursoEdicao.length + 1 };
    this.aulasDoModuloEdicao = [];
    this.prepararNovaAulaNoModulo();
  }

  selecionarAulaParaEditar(aulaItem: any): void {
    this.idAulaCriada = Number(aulaItem.id);
    this.editandoAulaExistente = true;
    const urlLimpa = String(aulaItem.video_url || '').split('?')[0];
    this.aula = {
      titulo: aulaItem.titulo || '',
      descricao: aulaItem.descricao || '',
      videoUrl: urlLimpa,
      ordem: Number(aulaItem.ordem || 1),
    };
    this.carregarQuizDaAulaParaEdicao(Number(aulaItem.id));
  }


  prepararNovaAulaNoModulo(): void {
    this.idAulaCriada = null;
    this.editandoAulaExistente = false;
    this.aula = { titulo: '', descricao: '', videoUrl: '', ordem: this.aulasDoModuloEdicao.length + 1 };
    this.quizTitulo = '';
    this.quizNotaMinima = 7;
    this.perguntasQuiz = [];
    this.indiceQuestaoEmEdicao = null;
  }

  carregarQuizDaAulaParaEdicao(aulaId: number): void {
    if (!aulaId) return;
    this.quizService.obterQuizParaEdicao(Number(aulaId)).subscribe({
      next: (res) => {
        const quiz = Array.isArray(res) ? res : res;
        if (quiz && Array.isArray(quiz.perguntas) && quiz.perguntas.length > 0) {
          this.quizTitulo = quiz.titulo || '';
          this.quizNotaMinima = Number(quiz.nota_minima || 7);
          const letras = ['A', 'B', 'C', 'D'];
          this.perguntasQuiz = quiz.perguntas.map((p: any) => {
            const alts = p.alternativas || [];
            const idxCorreta = alts.findIndex((a: any) => Boolean(a.correta));
            return {
              enunciado: p.pergunta || '',
              alternativaA: alts?.descricao || '',
              alternativaB: alts?.descricao || '',
              alternativaC: alts?.descricao || '',
              alternativaD: alts?.descricao || '',
              respostaCorreta: idxCorreta >= 0 ? letras[idxCorreta] : 'A',
            };
          });
        } else {
          this.quizTitulo = '';
          this.quizNotaMinima = 7;
          this.perguntasQuiz = [];
        }
        this.indiceQuestaoEmEdicao = null;
      },
      error: (err) => {
        console.error('Erro ao carregar quiz da aula para edição:', err);
        this.quizTitulo = '';
        this.perguntasQuiz = [];
      },
    });
  }


  editarQuestaoExistente(index: number): void {
    const q = this.perguntasQuiz[index];
    if (!q) return;
    this.indiceQuestaoEmEdicao = index;
    this.novaQuestao = { ...q };
  }

  removerQuestaoMemoria(index: number): void {
    this.perguntasQuiz.splice(index, 1);
    if (this.indiceQuestaoEmEdicao === index) {
      this.indiceQuestaoEmEdicao = null;
      this.novaQuestao = { enunciado: '', alternativaA: '', alternativaB: '', alternativaC: '', alternativaD: '', respostaCorreta: '' };
    }
  }

  salvarCursoBase(): void {
    if (!this.curso.titulo.trim()) return;
    const payload = {
      titulo: this.curso.titulo,
      descricao: this.curso.descricao,
      carga_horaria: this.curso.cargaHoraria,
      obrigatorio: this.curso.obrigatorio,
    };

    if (this.idCursoCriado) {
      this.treinamentoService.atualizarTreinamento(this.idCursoCriado, payload).subscribe({
        next: () => {
          this.alerts.sucesso('Dados gerais do treinamento atualizados com sucesso!');
          this.passoAtual = 2;
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err),
      });
      return;
    }

    this.treinamentoService.criarTreinamento(payload).subscribe({
      next: (res) => {
        this.idCursoCriado = res.id;
        this.alerts.sucesso('Treinamento base criado com sucesso!');
        this.passoAtual = 2;
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err),
    });
  }

  salvarModulo(): void {
    if (!this.modulo.titulo.trim() || !this.idCursoCriado) return;

    if (this.editandoModuloExistente && this.idModuloCriado) {
      this.treinamentoService
        .atualizarModulo(this.idModuloCriado, { titulo: this.modulo.titulo, ordem: Number(this.modulo.ordem) })
        .subscribe({
          next: (res) => {
            const idx = this.modulosDoCursoEdicao.findIndex((m) => Number(m.id) === Number(this.idModuloCriado));
            if (idx >= 0) this.modulosDoCursoEdicao[idx] = { ...this.modulosDoCursoEdicao[idx], ...res };
            this.alerts.sucesso('Módulo atualizado com sucesso!');
            this.passoAtual = 3;
          },
          error: (err: HttpErrorResponse) => this.tratarErro(err),
        });
      return;
    }

    const payload = {
      treinamentoId: Number(this.idCursoCriado),
      titulo: this.modulo.titulo,
      ordem: Number(this.modulo.ordem),
    };

    this.treinamentoService.adicionarModulo(payload).subscribe({
      next: (res) => {
        this.idModuloCriado = Number(res.id);
        this.editandoModuloExistente = true;
        this.modulosDoCursoEdicao = [...this.modulosDoCursoEdicao, { ...res, aulas: [] }];
        this.aulasDoModuloEdicao = [];
        this.idAulaCriada = null;
        this.editandoAulaExistente = false;
        this.aula = { titulo: '', descricao: '', videoUrl: '', ordem: 1 };
        this.alerts.sucesso('Módulo de ensino registrado com sucesso!');
        this.passoAtual = 3;
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err),
    });



  }

  irParaPassoAvaliacao(): void {
    if (!this.idAulaCriada && this.aulasDoModuloEdicao.length > 0) {
      this.selecionarAulaParaEditar(this.aulasDoModuloEdicao);
    } else if (this.idAulaCriada && this.perguntasQuiz.length === 0) {
      this.carregarQuizDaAulaParaEdicao(this.idAulaCriada);
    }
    this.passoAtual = 4;
  }

  adicionarQuestaoMemoria(): void {
    if (!this.novaQuestao.enunciado.trim() || !this.novaQuestao.respostaCorreta) return;
    if (this.indiceQuestaoEmEdicao !== null) {
      this.perguntasQuiz[this.indiceQuestaoEmEdicao] = { ...this.novaQuestao };
      this.indiceQuestaoEmEdicao = null;
      this.alerts.sucesso('Questão atualizada com sucesso!');
    } else {
      this.perguntasQuiz.push({ ...this.novaQuestao });
      this.alerts.sucesso('Questão adicionada ao banco temporário!');
    }
    this.novaQuestao = { enunciado: '', alternativaA: '', alternativaB: '', alternativaC: '', alternativaD: '', respostaCorreta: '' };
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
    if (tipo === 'DEPARTAMENTO') {
      return this.listaDepartamentos.find(d => String(d.id) === idProcurado)?.nome || `Departamento ID: ${idProcurado}`;
    }

    if (tipo === 'USUARIO') {
      return this.listaUsuarios.find(u => String(u.id) === idProcurado)?.nome || `Funcionário ID: ${idProcurado}`;
    }

    return `${tipo} ID: ${idProcurado}`;
  }

  carregarDadosOrigemProtheus(): void {
    this.isLoadingCursos = true;

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

    this.treinamentoService.obterDepartamentosERP().subscribe({
      next: (deptos) => this.listaDepartamentos = deptos,
      error: (err) => console.error('Erro ao carregar departamentos dinâmicos do Protheus:', err)
    });

    this.treinamentoService.obterUnidadesERP('1000000000000002').subscribe({
      next: (unidades) => this.listaUnidades = unidades,
      error: (err) => console.error('Erro ao inicializar unidades:', err)
    });

    this.treinamentoService.obterFuncionariosERP().subscribe({
      next: (users) => this.listaUsuarios = users,
      error: (err) => console.error('Erro ao carregar funcionários do ERP:', err)
    });

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

  aoMudarEmpresa(empresaId: string): void {
    this.vinculoRH.empresa_id = empresaId;
    this.vinculoRH.unidade_id = '';
    this.listaUnidades = [];

    if (!empresaId) return;

    // Disca para o serviço buscando as filiais correspondentes
    this.treinamentoService.obterUnidadesERP(empresaId).subscribe({
      next: (unidades) => {
        this.listaUnidades = unidades;
      },
      error: (err) => console.error('Erro ao buscar unidades filtradas:', err)
    });
  }

  podePublicarCurso(): boolean {
    try {
      const token = localStorage.getItem('accessToken');
      if (token && token.split('.').length === 3) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = String(payload.role || '').toLowerCase();
        return role === 'curador' || role === 'master';
      }
    } catch { }
    return false;
  }

  finalizarEsteiraTreinamento(): void {
    if (!this.idCursoCriado) {
      this.alerts.erro('Erro: Nenhum identificador de curso localizado para publicação.');
      return;
    }

    this.isLoadingCursos = true;
    const cursoId = Number(this.idCursoCriado);

    const requisicao$ = this.podePublicarCurso()
      ? this.treinamentoService.publicarTreinamentoComKanban(cursoId)
      : this.treinamentoService.enviarTreinamentoParaRevisao(cursoId);

    requisicao$.subscribe({
      next: (resposta) => {
        const msg = resposta?.message || (this.podePublicarCurso()
          ? 'Parabéns! Treinamento aprovado, publicado e inserido no Kanban!'
          : 'Treinamento enviado para análise da Curadoria! Ele será publicado após aprovação.');

        this.alerts.sucesso(msg);
        this.cursoSelecionadoParaGerenciar = null;
        this.idCursoCriado = null;
        this.listaVinculosAtivos = [];
        this.passoAtual = 0;
        this.carregarCatalogoGerencial();
      },
      error: (err) => {
        this.isLoadingCursos = false;
        console.error('Erro na finalização da esteira de treinamento:', err);
        const msgErro = err.error?.message || 'Falha de comunicação ao processar o treinamento.';
        this.alerts.erro(msgErro);
      }
    });
  }

  aprovarEPublicarCurso(curso: any): void {
    if (!curso?.id) return;

    this.isLoadingCursos = true;
    this.treinamentoService.publicarTreinamentoComKanban(Number(curso.id)).subscribe({
      next: (res) => {
        this.alerts.sucesso(res?.message || `Curso "${curso.titulo}" aprovado e publicado com sucesso! 🚀`);
        this.carregarCatalogoGerencial();
      },
      error: (err) => {
        this.isLoadingCursos = false;
        const msg = err.error?.message || 'Erro ao aprovar e publicar o treinamento.';
        this.alerts.erro(msg);
      },
    });
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

    this.geminiService.gerarQuestoesAutomaticas(this.textoBaseIA).subscribe({
      next: (questoesGeradas: any[]) => {
        if (questoesGeradas && questoesGeradas.length > 0) {
          this.perguntasQuiz = [...this.perguntasQuiz, ...questoesGeradas];
          this.alerts.sucesso(`Mágica concluída! ${questoesGeradas.length} questões regulamentares injetadas com sucesso via Google Gemini!`);
          this.textoBaseIA = '';
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

  carregarProjetosKanbanAdmin(): void { }

  carregarDicionariosRH(): void { }

  salvarQuizDoWizard(): void {
    if (!this.idAulaCriada) {
      this.alerts.erro('Erro: Cadastre pelo menos uma videoaula no Passo 3 antes de consolidar o Quiz.');
      return;
    }

    if (!this.perguntasQuiz || this.perguntasQuiz.length === 0) {
      this.alerts.erro('Por favor, gere as questões por Inteligência Artificial antes de avançar.');
      return;
    }

    const payloadFinal = {
      aulaId: Number(this.idAulaCriada),
      titulo: this.quizTitulo.trim() || `Avaliação de Conformidade Regulamentar`,
      notaMinima: Number(this.quizNotaMinima || 7),
      tentativas: 3,
      perguntas: this.perguntasQuiz
    };

    this.quizService.salvarQuizGeradoPorIA(payloadFinal).subscribe({
      next: (response) => {
        this.alerts.sucesso('Banco de questões de IA consolidado com sucesso no Postgres!');

        this.quizTitulo = '';
        this.perguntasQuiz = [];

        this.passoAtual = 5;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Falha na persistência relacional do Quiz da IA:', err);
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
        console.error('Erro ao buscar salas do chat:', err);
        this.isLoadingChats = false;
      }
    });
  }

  selecionarSalaSuporte(sala: any): void {
    this.salaChatSelecionada = sala;
    this.historicoMensagensChat = [];

    // Limpa inscrições anteriores para evitar duplicação ao trocar de conversa
    this.chatDadosSub?.unsubscribe();
    this.chatMensagemSub?.unsubscribe();

    this.chatDadosSub = this.chatApiService.dadosSala.subscribe((dados: any) => {
      if (dados && dados.salaId === sala.id) {
        this.historicoMensagensChat = dados.historico || [];
        this.rolarChatParaOFinal();
      }
    });

    this.chatMensagemSub = this.chatApiService.novaMensagem.subscribe((mensagem: any) => {
      if (mensagem && mensagem.sala_id === sala.id) {
        const jaExiste = this.historicoMensagensChat.some(m => m.id === mensagem.id);
        if (!jaExiste) {
          this.historicoMensagensChat.push(mensagem);
          this.rolarChatParaOFinal();
        }
      }
    });

    this.chatApiService.entrarNaSala(sala.usuario_id, sala.user?.name || 'Aluno');
  }

  enviarMensagemDoTutor(): void {
    if (!this.novaMensagemTutorText.trim() || !this.salaChatSelecionada) return;

    const tutorId = this.obterIdTutorLogado() || this.salaChatSelecionada.usuario_id;
    const conteudo = this.novaMensagemTutorText.trim();

    this.chatApiService.enviarMensagemInstantanea(
      this.salaChatSelecionada.id,
      tutorId,
      conteudo,
      true
    );

    this.novaMensagemTutorText = '';
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

    this.treinamentoService.removerVinculoPublico(vinculoId).subscribe({
      next: (resposta) => {
        this.listaVinculosAtivos = this.listaVinculosAtivos.filter(v => v.id !== vinculoId);

        this.snackBar.open('Vínculo organizacional removido com sucesso!', 'Fechar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      },
      error: (err) => {
        console.error('Erro ao remover vínculo regulamentar do Passo 5:', err);
        this.snackBar.open('Falha ao excluir o vínculo. Tente novamente.', 'Fechar', { duration: 4000 });
      }
    });
  }

  tratarErro(err: HttpErrorResponse): void { console.error(err); }
}
