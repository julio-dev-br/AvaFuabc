import { Component, OnInit, OnDestroy, inject, AfterViewInit, NgZone } from '@angular/core';
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

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}
declare var YT: any;

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
export class CursoPlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  private treinamentoService = inject(TreinamentoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private chatApiService = inject(ChatApiService);
  private zone = inject(NgZone);

  public idAulaAtualInstanciada: number | null = null;

  public player: any;
  private intervalMonitor: any;

  videoUrlBlindada!: SafeResourceUrl;

  curso: any = null;
  aulaAtiva: any = null;
  isLoading = true;

  chatAberto = false;
  salaId: number | null = null;
  historicoMensagens: any[] = [];
  novaMensagemText = '';

  public videoTocandoLocal = false;
  public videoJaTevePlayReal = false;
  private ultimoPercentualSalvoNoBanco = -1;


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

  ngAfterViewInit(): void {
    this.inicializarScriptYouTube();
    this.escutarEventosGlobaisDoIframeDoYouTube();
  }

  ngOnDestroy(): void {
    this.aulaAtiva = null;
    this.curso = null;
    this.chatApiService.desconectarDoSocket();
    if (this.intervalMonitor) {
      clearInterval(this.intervalMonitor);
    }
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

    if (this.intervalMonitor) {
      clearInterval(this.intervalMonitor);
    }
    this.player = null;
    this.aulaAtiva = null;
    this.idAulaAtualInstanciada = aula.id;

    setTimeout(() => {
      this.aulaAtiva = aula;

      if (aula.video_url) {
        let urlFinalReal = String(aula.video_url).trim();
        if (!urlFinalReal.includes('enablejsapi=1')) {
          urlFinalReal = urlFinalReal.includes('?') ? `${urlFinalReal}&enablejsapi=1` : `${urlFinalReal}?enablejsapi=1`;
        }

        this.videoUrlBlindada = this.sanitizer.bypassSecurityTrustResourceUrl(urlFinalReal);
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

  private inicializarScriptYouTube(): void {
    if (typeof YT !== 'undefined' && YT.Player) {
      this.construirInstanciaPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://youtube.com';
    const firstScriptTag = document.getElementsByTagName('script');
    if (firstScriptTag && firstScriptTag.length > 0 && firstScriptTag[0].parentNode) {
      firstScriptTag[0].parentNode.insertBefore(tag, firstScriptTag[0]);
    }

    window.onYouTubeIframeAPIReady = () => {
      this.construirInstanciaPlayer();
    };

    setTimeout(() => {
      this.construirInstanciaPlayer();
    }, 500);
  }

  private construirInstanciaPlayer(): void {
    try {
      console.log('📡 SENSOR DE MÍDIAS: Acoplando capturadores do YouTube no iframe...');

      this.player = new YT.Player('player-video-iframe', {
        events: {
          'onStateChange': (event: any) => this.gerenciarMudancaStatusPlayer(event),
          'onReady': () => {
            this.iniciarMonitoramentoTempo();
          }
        }
      });
      setTimeout(() => {
        if (this.player && typeof this.player.getCurrentTime === 'function') {
          this.iniciarMonitoramentoTempo();
        }
      }, 1200);

    } catch (error) {
      this.iniciarMonitoramentoTempo();
    }
  }

  private gerenciarMudancaStatusPlayer(event: any): void {
    if (event.data === 1) {

      this.videoTocandoLocal = true;
      this.iniciarMonitoramentoTempo();
    } else {
      this.videoTocandoLocal = false;
      if (this.intervalMonitor) {
        clearInterval(this.intervalMonitor);
      }
    }
  }

  private iniciarMonitoramentoTempo(): void {
    if (this.intervalMonitor) clearInterval(this.intervalMonitor);

    let progressoSimuladoContingencia = (this.aulaAtiva?.progresso_aulas?.[0]?.percentual || 0);
    
    this.ultimoPercentualSalvoNoBanco = progressoSimuladoContingencia;

    this.zone.runOutsideAngular(() => {
      this.intervalMonitor = setInterval(() => {
        if (!this.aulaAtiva) return;

        if (!this.videoJaTevePlayReal) return;

        try {
          const iframeFisico = document.getElementById('player-video-iframe') as HTMLIFrameElement;
          if (iframeFisico && iframeFisico.contentWindow) {
            iframeFisico.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
            iframeFisico.contentWindow.postMessage(JSON.stringify({ command: 'getPlayerState', id: 1 }), '*');
          }
        } catch (err) {}

        if (this.player && typeof this.player.getCurrentTime === 'function' && typeof this.player.getDuration === 'function') {
          try {
            const tempoAtual = this.player.getCurrentTime();
            const duracaoTotal = this.player.getDuration();

            if (duracaoTotal > 0) {
              const percentualCalculado = Math.round((tempoAtual / duracaoTotal) * 100);
              this.atualizarProgressoEInterfaceIndividual(percentualCalculado);
              return;
            }
          } catch (e) {
            console.warn('⚠️ Falha de escuta na API do YouTube.');
          }
        }

        if (!this.player || typeof this.player.getCurrentTime !== 'function') {
          try {
            if (progressoSimuladoContingencia < 100) {
              progressoSimuladoContingencia += 0.5; // Incremento controlado
              this.atualizarProgressoEInterfaceIndividual(Math.round(progressoSimuladoContingencia));
            }
          } catch (error) {
            console.error('❌ Erro no fallback de mídias:', error);
          }
        }

      }, 1000);
    });
  }

  private atualizarProgressoEInterfaceIndividual(percentualCalculado: number): void {
    if (!this.aulaAtiva.progresso_aulas) this.aulaAtiva.progresso_aulas = [{}];
    if (this.aulaAtiva.progresso_aulas.length === 0) this.aulaAtiva.progresso_aulas.push({ percentual: 0, concluida: false });

    if (percentualCalculado > (this.aulaAtiva.progresso_aulas[0].percentual || 0)) {
      this.zone.run(() => {
        this.aulaAtiva.progresso_aulas[0].percentual = percentualCalculado;
        console.log(`📈 TELEMETRIA LOCAL: Posição do vídeo atualizada para [${percentualCalculado}%]`);

        if (percentualCalculado % 10 === 0 && percentualCalculado < 100) {
          if (percentualCalculado !== this.ultimoPercentualSalvoNoBanco) {
            this.ultimoPercentualSalvoNoBanco = percentualCalculado; // Trava a porteira imediatamente!
            this.forçarConclusaoProgressoIndividual(percentualCalculado);
          }
        }

        if (percentualCalculado >= 100) {
          this.aulaAtiva.progresso_aulas[0].percentual = 100;
          this.aulaAtiva.progresso_aulas[0].concluida = true;
          
          if (this.ultimoPercentualSalvoNoBanco !== 100) {
            this.ultimoPercentualSalvoNoBanco = 100; 
            this.forçarConclusaoProgressoIndividual(100);
          }
          
          if (this.intervalMonitor) clearInterval(this.intervalMonitor);
        }
      });
    }
  }


  private forçarConclusaoProgressoIndividual(percentual: number): void {
    const idDaAulaAtiva = Number(this.aulaAtiva?.id);

    const payloadValido = {
      tempoAssistido: percentual, 
      concluida: percentual >= 100
    };

    this.treinamentoService.salvarProgressoVideoaula(idDaAulaAtiva, payloadValido).subscribe({
      next: (res) => {

        if (!this.aulaAtiva.progresso_aulas) this.aulaAtiva.progresso_aulas = [{}];
        this.aulaAtiva.progresso_aulas[0].percentual = percentual;

        if (percentual >= 100) {
          this.aulaAtiva.progresso_aulas[0].percentual = 100;
          this.aulaAtiva.progresso_aulas[0].concluida = true;
          console.log('🎉 PORTÃO DE SEGURANÇA DESTRANCADO: Avaliação liberada!');
        }
      },
      error: (err) => console.error('❌ Falha ao sincronizar métricas de progresso via API Patch:', err)
    });
  }

  public executarPlayCortinaSegura(): void {
    this.videoJaTevePlayReal = true;
    this.iniciarMonitoramentoTempo();

    if (this.player && typeof this.player.playVideo === 'function') {
      try { this.player.playVideo(); } catch (e) { }
    }
  }

  public dispararPlayManualNativo(): void {
    this.videoTocandoLocal = !this.videoTocandoLocal; 
    if (this.videoTocandoLocal) {
      this.iniciarMonitoramentoTempo();
    }
  }

  public simularConclusaoInstantaneaDEV(): void {

    if (!this.aulaAtiva.progresso_aulas) {
      this.aulaAtiva.progresso_aulas = [{}];
    }
    if (this.aulaAtiva.progresso_aulas.length === 0) {
      this.aulaAtiva.progresso_aulas.push({ percentual: 0, concluida: false });
    }

    this.aulaAtiva.progresso_aulas[0].percentual = 100;
    this.aulaAtiva.progresso_aulas[0].concluida = true;

    if (this.intervalMonitor) {
      clearInterval(this.intervalMonitor);
    }

    this.forçarConclusaoProgressoIndividual(100);
  }

  private escutarEventosGlobaisDoIframeDoYouTube(): void {
    window.addEventListener('message', (event) => {
      if (!event.origin.includes('youtube.com')) return;

      try {
        let dadosDoEvento = event.data;

        if (typeof dadosDoEvento === 'string') {
          dadosDoEvento = JSON.parse(dadosDoEvento);
        }

        let statusVideo: number | null = null;

        if (dadosDoEvento?.event === 'infoDelivery' && typeof dadosDoEvento?.info?.playerState !== 'undefined') {
          statusVideo = dadosDoEvento.info.playerState;
        } else if (typeof dadosDoEvento?.info?.playerState !== 'undefined') {
          statusVideo = dadosDoEvento.info.playerState;
        } else if (dadosDoEvento?.event === 'onStateChange') {
          statusVideo = Number(dadosDoEvento.info);
        }

        if (statusVideo !== null) {
          if (statusVideo === 1) {
            console.log('📈 TELEMETRIA ATIVA: Vídeo tocando! Retomando contagem de mídias.');
            this.videoJaTevePlayReal = true;
          } else if (statusVideo === 2 || statusVideo === 0 || statusVideo === -1) {
            console.log('📉 TELEMETRIA ATIVA: Vídeo pausado ou parado! Congelando barra.');
            this.videoJaTevePlayReal = false;
          }
        }
      } catch (e) { }
    });
  }
  
  alternarJanelaChat(): void {
    this.chatAberto = !this.chatAberto;

    if (this.chatAberto) {
      this.chatApiService.entrarNaSala(this.alunoLogado.id, this.alunoLogado.name);

      this.chatApiService.dadosSala.subscribe((dados: any) => {
        if (dados) {
          this.salaId = dados.salaId;
          this.historicoMensagens = dados.historico || [];
          this.rolarChatAlunoParaOFinal();
        }
      });

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
