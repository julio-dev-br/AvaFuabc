import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TreinamentoService } from '../../core/services/treinamento.service';
import { QuizService } from '../../core/services/quiz.service';
import { AlertsService } from '../../core/services/alerts.service';
import { environment } from '../../../environments/environment';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-homologacao-curso',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatExpansionModule,
  ],
  templateUrl: './homologacao-curso.component.html',
})
export class HomologacaoCursoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private treinamentoService = inject(TreinamentoService);
  private quizService = inject(QuizService);
  private alerts = inject(AlertsService);

  cursoId!: number;
  curso: any = null;
  quizzesPorAula: { [aulaId: number]: any } = {};
  isLoading = true;
  isPublicando = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cursoId = Number(idParam);
      this.carregarDadosParaHomologacao();
    } else {
      this.alerts.erro('ID do treinamento não informado.');
      this.router.navigate(['/admin/cadastro']);
    }
  }

  carregarDadosParaHomologacao(): void {
    this.isLoading = true;
    this.treinamentoService.obterConteudoCurso(this.cursoId).subscribe({
      next: (dadosCurso) => {
        this.curso = dadosCurso;
        const todasAulas: any[] = [];
        (dadosCurso?.modulos || []).forEach((mod: any) => {
          (mod?.aulas || []).forEach((aula: any) => todasAulas.push(aula));
        });

        if (todasAulas.length === 0) {
          this.isLoading = false;
          return;
        }

        const chamadasQuiz = todasAulas.reduce((acc: any, aula: any) => {
          acc[aula.id] = this.quizService.obterQuizPorAula(aula.id).pipe(catchError(() => of(null)));
          return acc;
        }, {});

        forkJoin(chamadasQuiz).subscribe({
          next: (resQuizzes: any) => {
            Object.keys(resQuizzes).forEach((aulaIdStr) => {
              const dado = resQuizzes[aulaIdStr];
              const quizObj = Array.isArray(dado) ? dado : dado;
              if (quizObj && quizObj.perguntas) {
                this.quizzesPorAula[Number(aulaIdStr)] = quizObj;
              }
            });
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          },
        });
      },
      error: (err) => {
        console.error('Erro ao carregar curso para homologação:', err);
        this.alerts.erro('Não foi possível carregar os dados do treinamento.');
        this.isLoading = false;
      },
    });
  }

  obterVideoUrlSegura(url: string): SafeResourceUrl {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(String(url).trim());
  }

  configurarUrlMaterial(url: string): string {
    if (!url) return '#';
    const urlLimpa = url.trim();
    if (urlLimpa.startsWith('http://') || urlLimpa.startsWith('https://')) {
      return urlLimpa;
    }
    return `${environment.apiUrl}${urlLimpa}`;
  }

  contarTotalAulas(): number {
    if (!this.curso?.modulos) return 0;
    return this.curso.modulos.reduce((total: number, m: any) => total + (m.aulas?.length || 0), 0);
  }

  aprovarEPublicar(): void {
    if (!this.cursoId || this.isPublicando) return;
    this.isPublicando = true;

    this.treinamentoService.publicarTreinamentoComKanban(this.cursoId).subscribe({
      next: (res) => {
        this.alerts.sucesso(
          res?.message || `Treinamento "${this.curso?.titulo}" homologado e publicado com sucesso! 🚀`
        );
        this.isPublicando = false;
        this.router.navigate(['/admin/cadastro']);
      },
      error: (err) => {
        this.isPublicando = false;
        const msg = err.error?.message || 'Erro ao homologar e publicar o treinamento.';
        this.alerts.erro(msg);
      },
    });
  }
}
