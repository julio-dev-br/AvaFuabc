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

  // 🌟 GATILHO DE BOOT VISUAL: Inicializa o script do YouTube assim que o HTML renderizar
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
        // 🌟 CORREÇÃO ROBUSTA: O link ganha a flag da API do Google de fábrica
        let urlFinalReal = String(aula.video_url).trim();
        if (!urlFinalReal.includes('enablejsapi=1')) {
          urlFinalReal = urlFinalReal.includes('?') ? `${urlFinalReal}&enablejsapi=1` : `${urlFinalReal}?enablejsapi=1`;
        }
        // Grava na variável estática. O Angular lê isso uma única vez e nunca mais mexe no iframe!
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

  // ==========================================
  // ENGENHARIA DE TELEMETRIA DA API DO YOUTUBE
  // ==========================================

  private inicializarScriptYouTube(): void {
    // 🌟 SEGUNDO DISPARO SEGURO: Se a biblioteca já existe, pula a injeção e liga a escuta direto!
    if (typeof YT !== 'undefined' && YT.Player) {
      this.construirInstanciaPlayer();
      return;
    }

    // 🚀 RETIFICADO: Injeta a URL oficial completa da biblioteca JavaScript de controle do Google!
    const tag = document.createElement('script');
    tag.src = 'https://youtube.com';
    const firstScriptTag = document.getElementsByTagName('script');
    if (firstScriptTag && firstScriptTag.length > 0 && firstScriptTag[0].parentNode) {
      firstScriptTag[0].parentNode.insertBefore(tag, firstScriptTag[0]);
    }

    window.onYouTubeIframeAPIReady = () => {
      this.construirInstanciaPlayer();
    };

    // Vacina de redundância: Garante a tentativa de acoplamento rápido
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
            console.log('📺 API YOUTUBE: Player pronto e sincronizado via Google!');
            this.iniciarMonitoramentoTempo();
          }
        }
      });

      // Gatilho de segurança autônomo caso o evento onReady do Google demore na rede da empresa
      setTimeout(() => {
        if (this.player && typeof this.player.getCurrentTime === 'function') {
          this.iniciarMonitoramentoTempo();
        }
      }, 1200);

    } catch (error) {
      console.warn('⚠️ Falha ao acoplar API nativa. Ativando monitoria autônoma...');
      this.iniciarMonitoramentoTempo();
    }
  }

  private gerenciarMudancaStatusPlayer(event: any): void {
    if (event.data === 1) { // 1 = PLAYING (Se a API do Google responder)
      console.log('📺 API YOUTUBE: Vídeo rodando. Ativando cronômetro...');
      this.videoTocandoLocal = true;
      this.iniciarMonitoramentoTempo();
    } else {
      // Se pausou ou parou, vira a flag e interrompe temporariamente
      this.videoTocandoLocal = false;
      if (this.intervalMonitor) {
        clearInterval(this.intervalMonitor);
      }
    }
  }

  private iniciarMonitoramentoTempo(): void {
    if (this.intervalMonitor) clearInterval(this.intervalMonitor);

    console.log('🚀 TIMER NEUTRO ATIVADO: Telemetria híbrida aguardando play real do colaborador...');

    let progressoSimuladoContingencia = (this.aulaAtiva?.progresso_aulas?.[0]?.percentual || 0);
    
    // Sincroniza a trava inicial com o que já veio carregado do banco para não re-enviar no boot
    this.ultimoPercentualSalvoNoBanco = progressoSimuladoContingencia;

    this.zone.runOutsideAngular(() => {
      this.intervalMonitor = setInterval(() => {
        if (!this.aulaAtiva) return;

        if (!this.videoJaTevePlayReal) return;

        // 🌟 ESTÍMULO MECÂNICO ANTI-ADBLOCK
        try {
          const iframeFisico = document.getElementById('player-video-iframe') as HTMLIFrameElement;
          if (iframeFisico && iframeFisico.contentWindow) {
            iframeFisico.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
            iframeFisico.contentWindow.postMessage(JSON.stringify({ command: 'getPlayerState', id: 1 }), '*');
          }
        } catch (err) {}

        // CENÁRIO A: API DO GOOGLE RESPONDENDO
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

        // CENÁRIO B: CONTINGÊNCIA ATÔMICA (uBlock ativo)
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

        // 🛡️ VACINA DE DISPARO ÚNICO POR FAIXA: Só envia se for uma nova dezena e não foi enviada ainda!
        if (percentualCalculado % 10 === 0 && percentualCalculado < 100) {
          if (percentualCalculado !== this.ultimoPercentualSalvoNoBanco) {
            this.ultimoPercentualSalvoNoBanco = percentualCalculado; // Trava a porteira imediatamente!
            this.forçarConclusaoProgressoIndividual(percentualCalculado);
          }
        }

        // Se bater 100% assistido ou arrastado, crava a conclusão definitiva
        if (percentualCalculado >= 100) {
          this.aulaAtiva.progresso_aulas[0].percentual = 100;
          this.aulaAtiva.progresso_aulas[0].concluida = true;
          
          if (this.ultimoPercentualSalvoNoBanco !== 100) {
            this.ultimoPercentualSalvoNoBanco = 100; // Trava a porteira final
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
      tempoAssistido: percentual, // Casado perfeitamente com o body do NestJS
      concluida: percentual >= 100
    };

    console.log(`📡 COMUNICAÇÃO DE MÍDIAS: Enviando Patch para Aula ID [${idDaAulaAtiva}]:`, payloadValido);

    this.treinamentoService.salvarProgressoVideoaula(idDaAulaAtiva, payloadValido).subscribe({
      next: (res) => {
        console.log(`✔️ BANCO ATUALIZADO: Registro de [${percentual}%] gravado fisicamente!`);

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
    console.log('🖱️ CORTINA COMPLIANCE: Aluno acionou o player de vídeo! Destravando cronômetro.');
    this.videoJaTevePlayReal = true;
    this.iniciarMonitoramentoTempo();

    // Tenta forçar o play nativo se a biblioteca do Google estiver acessível por baixo da malha
    if (this.player && typeof this.player.playVideo === 'function') {
      try { this.player.playVideo(); } catch (e) { }
    }
  }

  public dispararPlayManualNativo(): void {
    console.log('🖱️ CLIQUE DETECTADO: Aluno ativou a mídia! Ligando cronômetro...');
    this.videoTocandoLocal = !this.videoTocandoLocal; // Alterna entre Play e Pause
    if (this.videoTocandoLocal) {
      this.iniciarMonitoramentoTempo();
    }
  }

  public simularConclusaoInstantaneaDEV(): void {
    console.log('🎮 DEV MODE: Forçando conclusão instantânea da videoaula activa...');

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

        // Se a mensagem vier em formato string stringificada, descriptografa para objeto
        if (typeof dadosDoEvento === 'string') {
          dadosDoEvento = JSON.parse(dadosDoEvento);
        }

        // 🌟 CAPTURA MULTI-CAMADA: Tenta ler o estado em todas as variações que o YouTube pode arremessar
        let statusVideo: number | null = null;

        if (dadosDoEvento?.event === 'infoDelivery' && typeof dadosDoEvento?.info?.playerState !== 'undefined') {
          statusVideo = dadosDoEvento.info.playerState;
        } else if (typeof dadosDoEvento?.info?.playerState !== 'undefined') {
          statusVideo = dadosDoEvento.info.playerState;
        } else if (dadosDoEvento?.event === 'onStateChange') {
          // Captura a assinatura direta de hooks de eventos do Google
          statusVideo = Number(dadosDoEvento.info);
        }

        // 📊 PROCESSAMENTO DO STATUS SEGURO:
        // 1 = PLAYING (Vídeo rodando de verdade)
        // 2 = PAUSED (Vídeo pausado)
        // 0 = ENDED (Vídeo finalizado)
        if (statusVideo !== null) {
          if (statusVideo === 1) {
            console.log('📈 TELEMETRIA ATIVA: Vídeo tocando! Retomando contagem de mídias.');
            this.videoJaTevePlayReal = true;
          } else if (statusVideo === 2 || statusVideo === 0 || statusVideo === -1) {
            console.log('📉 TELEMETRIA ATIVA: Vídeo pausado ou parado! Congelando barra.');
            this.videoJaTevePlayReal = false;
          }
        }
      } catch (e) {
        // Silencia dados de infraestrutura irrelevantes do postMessage
      }
    });
  }

  // ==========================================
  // LOGÍSTICA DE COMUNICAÇÃO DO CHAT CHANNELS
  // ==========================================

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
