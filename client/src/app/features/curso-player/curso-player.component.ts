import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatApiService } from '../../core/services/chat.service';

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
    MatToolbarModule,
    MatProgressBarModule,
    FormsModule,
    MatCardModule
  ],
  templateUrl: './curso-player.component.html',
  styleUrl: './curso-player.component.css'
})
export class CursoPlayerComponent implements OnInit, OnDestroy {
  private treinamentoService = inject(TreinamentoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private chatApiService = inject(ChatApiService);
  public idAulaAtualInstanciada: number | null = null;

  videoUrlBlindada!: SafeResourceUrl;

  curso: any = null;
  aulaAtiva: any = null;
  isLoading = true;

  chatAberto = false;
  salaId: number | null = null;
  historicoMensagens: any[] = [];
  novaMensagemText = '';

  alunoLogado = {
    id: Number(localStorage.getItem('userId') || 1),
    name: localStorage.getItem('userName') || 'Julio Valente (Aluno)'
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.carregarDadosCurso(Number(idParam));
    }
  }
  ngOnDestroy(): void {
    this.aulaAtiva = null;
    this.curso = null;
    this.chatApiService.desconectarDoSocket();
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
    if (!aula) return;
    if (this.idAulaAtualInstanciada === aula.id) {
      return;
    }

    this.aulaAtiva = null;
    this.idAulaAtualInstanciada = aula.id;

    setTimeout(() => {
      this.aulaAtiva = aula;

      if (aula.video_url) {
        this.videoUrlBlindada = this.obterVideoUrlSegura(aula.video_url);
      }
    }, 50);
  }

  obterVideoUrlSegura(url: string): SafeResourceUrl {
    if (!url) return '';
    const urlFinalReal = String(url).trim();
    return this.sanitizer.bypassSecurityTrustResourceUrl(urlFinalReal);
  }

  configurarUrlMaterial(url: string): string {
    if (!url) return '#';
    const urlLimpa = url.trim();
    if (urlLimpa.startsWith('http://') || urlLimpa.startsWith('https://')) {
      return urlLimpa;
    }
    return `${environment.apiUrl}${urlLimpa}`;
  }

  alternarJanelaChat(): void {
    this.chatAberto = !this.chatAberto;

    if (this.chatAberto) {
      this.chatApiService.entrarNaSala(this.alunoLogado.id, this.alunoLogado.name);

      // Escuta o pacote de histórico inicial enviado pelo back-end NestJS
      this.chatApiService.dadosSala.subscribe((dados: any) => {
        if (dados) {
          this.salaId = dados.salaId;
          this.historicoMensagens = dados.historico || [];
          this.rolarChatAlunoParaOFinal();
        }
      });

      // Escuta novas mensagens pingando do broadcast do WebSocket
      this.chatApiService.novaMensagem.subscribe((msgRecebida: any) => {
        if (msgRecebida && msgRecebida.sala_id === this.salaId) {
          const jaExiste = this.historicoMensagens.some(m => m.id === msgRecebida.id);
          if (!jaExiste) {
            this.historicoMensagens.push(msgRecebida);
            this.rolarChatAlunoParaOFinal();
          }
        }
      });
    }
  }

  enviarMensagemDoAluno(): void {
    if (!this.novaMensagemText.trim() || !this.salaId) return;

    const conteudo = this.novaMensagemText.trim();
    this.chatApiService.enviarMensagemInstantanea(
      this.salaId,
      this.alunoLogado.id,
      conteudo,
      false
    );

    this.novaMensagemText = '';
  }

  private rolarChatAlunoParaOFinal(): void {
    setTimeout(() => {
      const container = document.getElementById('aluno-chat-scroll-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
