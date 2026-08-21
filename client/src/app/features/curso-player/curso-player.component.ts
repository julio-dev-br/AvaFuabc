import { Component, OnInit, OnDestroy, inject } from '@angular/core'; // 🌟 Adicionado OnDestroy
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TreinamentoService } from '../../core/services/treinamento.service';
import { environment } from '../../../environments/environment';

// Angular Material Components
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

// 🌟 IMPORTAÇÃO DE SEGURANÇA REQUERIDA PELO COMPILADOR:
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-curso-player',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatListModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule
  ],
  templateUrl: './curso-player.component.html',
  styleUrl: './curso-player.component.css'
})
export class CursoPlayerComponent implements OnInit, OnDestroy { // 🌟 Implementa OnDestroy
  private treinamentoService = inject(TreinamentoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer); // 🌟 Injeta o motor de limpeza do Angular

  curso: any = null;
  aulaAtiva: any = null;
  isLoading = true;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.carregarDadosCurso(Number(idParam));
    }
  }

  // 🌟 A VACINA CONTRA O RETORNO DA PÁGINA: Limpa a memória RAM do player quando o aluno sai da tela!
  ngOnDestroy(): void {
    this.aulaAtiva = null;
    this.curso = null;
    console.log('=== COMPONENTE DESTRUIDO: CACHES LIMPOS ===');
  }

  carregarDadosCurso(id: number): void {
    this.treinamentoService.obterConteudoCurso(id).subscribe({
      next: (dados) => {
        this.curso = dados;
        this.isLoading = false;

        if (dados?.modulos?.[0]?.aulas?.[0]) {
          this.selecionarAula(dados.modulos[0].aulas[0]);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar conteúdo do curso:', err);
        this.isLoading = false;
      }
    });
  }

  selecionarAula(aula: any): void {
    // 🌟 RESET TÁTICO REATIVO: Derruba a aula ativa por 50ms para forçar o @if do HTML a recriar o iframe limpo
    this.aulaAtiva = null;

    setTimeout(() => {
      this.aulaAtiva = aula;
      console.log('=== NOVA AULA SELECIONADA E ATIVADA ===', this.aulaAtiva);
    }, 50);
  }

  obterVideoUrlSegura(url: string): SafeResourceUrl {
    if (!url) return '';

    // 🌟 CAPTURA DIRETA: O link do banco já está perfeito (https://www.youtube.com/embed/...)
    // Só precisamos garantir que espaços em branco nas pontas sejam removidos, mantendo maiúsculas e minúsculas intactas!
    const urlFinalReal = String(url).trim();

    console.log('=== IFRAME TARGET COMPLETO ===', urlFinalReal);

    // Entrega o link perfeito e limpo para o player rodar sem travas do Sanitizer
    return this.sanitizer.bypassSecurityTrustResourceUrl(urlFinalReal);
  }

  configurarUrlMaterial(url: string): string {
    if (!url) return '#';

    const urlLimpa = url.trim();

    // Se o link já começar com http (SharePoint/Nuvem), retorna ele puro
    if (urlLimpa.startsWith('http://') || urlLimpa.startsWith('https://')) {
      return urlLimpa;
    }

    // Se for um arquivo físico local (ex: /uploads/...), anexa a URL base do backend NestJS
    return `${environment.apiUrl}${urlLimpa}`;
  }

  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
