import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
// 🌟 CORRIGIDO: Forçamos a importação do Server explicitamente de dentro do pacote 'socket.io'
import { Server, Socket } from 'socket.io'; 
import { ChatService } from './chat.service';


// 🌟 CONFIGURAÇÃO DO GATEWAY: Habilita o CORS para o seu front-end Angular escutar o tráfego de mensagens
@WebSocketGateway({
    cors: {
        origin: '*', // Em produção, você pode restringir para a URL exata do seu front-end
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: any;

    constructor(private readonly chatService: ChatService) { }

    // 🔌 Conexão inicial: Disparada quando o dispositivo do Aluno ou do RH abre o Chat
    handleConnection(client: Socket) {
        console.log(`🔌 Novo dispositivo conectado ao Chat Central. Socket ID: [${client.id}]`);
    }

    // ❌ Desconexão de rede
    handleDisconnect(client: Socket) {
        console.log(`❌ Dispositivo desconectado do Chat Central. Socket ID: [${client.id}]`);
    }

    // 🚪 EVENTO 1: Cria ou entra reativamente em uma sala de suporte isolada no Postgres
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @MessageBody() data: { usuarioId: number; nomeUsuario: string },
        @ConnectedSocket() client: Socket,
    ) {
        const sala = await this.chatService.obterOuCriarSala(data.usuarioId, data.nomeUsuario);

        // Agrupa o socket do usuário dentro do canal exclusivo desta sala
        client.join(`sala_${sala.id}`);
        console.log(`🚪 Usuário [${data.nomeUsuario}] entrou reativamente na Sala ID: [${sala.id}]`);

        // Devolve para a tela os dados da sala e o histórico cronológico de conversas antigas
        const historico = await this.chatService.carregarHistorico(sala.id);
        client.emit('roomData', { salaId: sala.id, titulo: sala.titulo, historico });
    }

    // 💬 EVENTO 2: Recebe a mensagem instantânea e faz o broadcast em tempo real para a sala
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() data: { salaId: number; usuarioId: number; conteudo: string; isTutor: boolean },
    ) {
        // Persiste a nova mensagem fisicamente no banco de dados através do Prisma
        const novaMensagem = await this.chatService.registrarMensagem(
            data.salaId,
            data.usuarioId,
            data.conteudo,
            data.isTutor,
        );

        // Transmite a mensagem em tempo real para todos os integrantes conectados na mesma sala
        this.server.to(`sala_${data.salaId}`).emit('newMessage', novaMensagem);
        console.log(`💬 Mensagem transmitida na Sala [${data.salaId}]: ${data.conteudo}`);
    }
}
