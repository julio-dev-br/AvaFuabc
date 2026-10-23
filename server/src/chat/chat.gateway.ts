import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io'; 
import { ChatService } from './chat.service';



@WebSocketGateway({
    cors: {
        origin: '*', 
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: any;

    constructor(private readonly chatService: ChatService) { }

    handleConnection(client: Socket) { }

    handleDisconnect(client: Socket) { }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @MessageBody() data: { usuarioId: number; nomeUsuario: string },
        @ConnectedSocket() client: Socket,
    ) {
        const sala = await this.chatService.obterOuCriarSala(data.usuarioId, data.nomeUsuario);

        client.join(`sala_${sala.id}`);

        const historico = await this.chatService.carregarHistorico(sala.id);
        client.emit('roomData', { salaId: sala.id, titulo: sala.titulo, historico });
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() data: { salaId: number; usuarioId: number; conteudo: string; isTutor: boolean },
    ) {

        const novaMensagem = await this.chatService.registrarMensagem(
            data.salaId,
            data.usuarioId,
            data.conteudo,
            data.isTutor,
        );

        this.server.to(`sala_${data.salaId}`).emit('newMessage', novaMensagem);
    }
}
