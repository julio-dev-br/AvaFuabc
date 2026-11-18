import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/chat`;
  private socket!: Socket;
  
  private novaMensagemSubject = new Subject<any>();
  public novaMensagem = this.novaMensagemSubject.asObservable();

  private dadosSalaSubject = new BehaviorSubject<any>(null);
  public dadosSala = this.dadosSalaSubject.asObservable();

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'access-token': token,
      'token': token
    });
  }

  conectarAoSocket(): void {
    if (this.socket?.connected) return;

    // Garante conexão na raiz do servidor (remove '/api' caso exista no environment.apiUrl)
    const socketUrl = environment.apiUrl.replace(/\/api\/?$/, '');

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('🟢 WebSocket conectado com sucesso! ID:', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('🔴 Erro ao conectar WebSocket:', err.message);
    });

    this.socket.on('roomData', (dados: any) => {
      this.dadosSalaSubject.next(dados);
    });

    this.socket.on('newMessage', (mensagem: any) => {
      this.novaMensagemSubject.next(mensagem);
    });
  }

  entrarNaSala(usuarioId: number, nomeUsuario: string): void {
    this.conectarAoSocket();
    this.socket.emit('joinRoom', { usuarioId, nomeUsuario });
  }

  enviarMensagemInstantanea(salaId: number, usuarioId: number, conteudo: string, isTutor: boolean): void {
    const payload = { salaId, usuarioId, conteudo, isTutor };
    this.socket.emit('sendMessage', payload);
  }

  listarSalasAtivasDoRH(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salas`, { headers: this.getHeaders() });
  }

  desconectarDoSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('❌ Conexão do Chat Central encerrada com segurança.');
    }
  }
  
}
