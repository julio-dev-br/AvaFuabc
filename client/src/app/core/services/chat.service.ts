import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/chat`;
  
  // 🌟 O CORAÇÃO DO TEMPO REAL: Instância física do Socket.io
  private socket!: Socket;
  
  // Canal reativo para propagar novas mensagens recebidas para os componentes da tela
  private novaMensagemSubject = new Subject<any>();
  public novaMensagem = this.novaMensagemSubject.asObservable();

  // Canal reativo para propagar a carga inicial do histórico da sala
  private dadosSalaSubject = new Subject<any>();
  public dadosSala = this.dadosSalaSubject.asObservable();

  // Reutiliza o mesmo padrão de segurança sênior que você padronizou nos cabeçalhos
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'access-token': token,
      'token': token
    });
  }

  // 🔌 CONEXÃO FÍSICA DE REDE: Liga os motores do WebSocket
  conectarAoSocket(): void {
    if (this.socket?.connected) return;

    // Disca para a URL base do back-end abrindo o canal de Socket
    this.socket = io(environment.apiUrl, {
      autoConnect: true,
      reconnectionAttempts: 5, // Tenta reconectar 5 vezes se a rede oscilar
      reconnectionDelay: 2000
    });

    console.log('🔌 Conectando ao cluster do Chat Central via WebSocket...');

    // 🖥️ ESCUTA 1: Recebe o pacote de histórico inicial ao entrar na sala
    this.socket.on('roomData', (dados: any) => {
      this.dadosSalaSubject.next(dados);
    });

    // 🖥️ ESCUTA 2: Escuta novas mensagens pingando em tempo real do broadcast
    this.socket.on('newMessage', (mensagem: any) => {
      this.novaMensagemSubject.next(mensagem);
    });
  }

  // 🚪 AÇÃO 1: Entra reativamente em um canal de sala isolada (Join Room)
  entrarNaSala(usuarioId: number, nomeUsuario: string): void {
    this.conectarAoSocket();
    this.socket.emit('joinRoom', { usuarioId, nomeUsuario });
  }

  // 💬 AÇÃO 2: Envia o texto digitado instantaneamente na fiação do Socket
  enviarMensagemInstantanea(salaId: number, usuarioId: number, conteudo: string, isTutor: boolean): void {
    const payload = { salaId, usuarioId, conteudo, isTutor };
    this.socket.emit('sendMessage', payload);
  }

  // 🗂️ HTTP TRADICIONAL DO RH: Lista todas as salas abertas para o painel gerencial
  listarSalasAtivasDoRH(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salas`, { headers: this.getHeaders() });
  }

  // ❌ Desconexão de segurança (Limpa o canal ao sair da tela)
  desconectarDoSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('❌ Conexão do Chat Central encerrada com segurança.');
    }
  }
}
