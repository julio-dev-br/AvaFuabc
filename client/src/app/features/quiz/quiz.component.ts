import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Importação dos serviços
import { QuizService } from '../../core/services/quiz.service';
import { AlertsService } from '../../core/services/alerts.service'; 

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule
  ],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  private quizService = inject(QuizService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alerts = inject(AlertsService);

  aulaId!: number;
  quiz: any = null;
  isLoading = true;

  respostasSelecionadas: { [key: number]: number } = {};
  resultadoEnvio: any = null;
  foiEnviado = false;
  
  aprovado = false;
  notaFinal = 0;
  notaMinimaExigida = 7;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.aulaId = Number(idParam);
      this.carregarQuiz();
    } else {
      this.alerts.erro('ID da aula não localizado nos parâmetros de navegação.');
      this.isLoading = false;
    }
  }

  carregarQuiz(): void {
    this.isLoading = true;
    this.quizService.obterQuizPorAula(this.aulaId).subscribe({
      next: (dados) => {
        if (Array.isArray(dados)) {
          this.quiz = dados[0] || null;
        } else {
          this.quiz = dados;
        }
        
        if (this.quiz) {
          this.notaMinimaExigida = this.quiz.notaMinima !== undefined ? Number(this.quiz.notaMinima) : 7;
        }
        
        this.isLoading = false;
        console.log('Quiz carregado com sucesso:', this.quiz);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro detalhado ao buscar o quiz:', err);
        this.isLoading = false;
      }
    });
  }

  selecionarAlternativa(perguntaId: number, alternativaId: number): void {
    this.respostasSelecionadas[perguntaId] = Number(alternativaId);
  }

  formularioValido(): boolean {
    if (!this.quiz || !this.quiz.perguntas || !Array.isArray(this.quiz.perguntas) || this.quiz.perguntas.length === 0) {
      return false;
    }
    const totalRespondidas = Object.keys(this.respostasSelecionadas).length;
    return totalRespondidas === this.quiz.perguntas.length;
  }

  entregarProva(): void {
    if (!this.quiz || !this.quiz.id) {
      this.alerts.erro('Impossível enviar: ID do questionário ausente.');
      return;
    }

    this.isLoading = true;

    const listaRespostas = Object.keys(this.respostasSelecionadas).map(perguntaId => ({
      perguntaId: Number(perguntaId),
      alternativaId: this.respostasSelecionadas[Number(perguntaId)]
    }));

    const payloadCompleto = {
      aulaId: Number(this.aulaId),
      respostas: listaRespostas
    };

    console.log('=== ENVIANDO PROVA PARA CORREÇÃO DO BACKEND ===', payloadCompleto);

    this.quizService.enviarRespostas(this.quiz.id, payloadCompleto).subscribe({
      next: (respostaServidor) => {
        this.resultadoEnvio = respostaServidor;
        this.foiEnviado = true;
        this.isLoading = false;

        this.notaFinal = respostaServidor.notaFinal !== undefined ? Number(respostaServidor.notaFinal) : 0;
        this.aprovado = respostaServidor.aprovado === true;

        if (this.aprovado) {
          this.alerts.sucesso(`Parabéns! Você foi Aprovado! Nota: ${this.notaFinal}. Seu certificado já está disponível! 🏆`);
        } else {
          this.alerts.erro(`Nota: ${this.notaFinal}. Você ficou abaixo da média mínima (${this.notaMinimaExigida}). Tente novamente! 📝`);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao processar correção do quiz:', err);
        const msg = err.error?.message || 'Falha ao processar a correção da prova.';
        this.alerts.erro(msg);
        this.isLoading = false;
      }
    });
  }

  refazerAvaliacao(): void {
    this.respostasSelecionadas = {};
    this.resultadoEnvio = null;
    this.foiEnviado = false;
    this.aprovado = false;
    this.notaFinal = 0;
  }

  voltarParaAula(): void {
    const treinamentoId = this.quiz?.aula?.modulo?.treinamento_id || this.quiz?.treinamento_id || 4;
    this.router.navigate(['/curso', treinamentoId]);
  }
}
