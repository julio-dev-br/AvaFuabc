import { Controller, Get, Param, ParseIntPipe, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('chat')
@UseGuards(AuthGuard) // 🌟 SEGURANÇA: Exige login ativo no sistema para qualquer rota
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 🗂️ 1. LISTAGEM DO RH: Retorna todas as salas de chat abertas pelos alunos no Postgres
  @Get('salas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager') // 🔥 Restrito: Apenas gestores administrativos e RH podem ver a lista de chats
  @HttpCode(HttpStatus.OK)
  async listarSalasAtivas() {
    console.log('📡 Rota GET /chat/salas acionada pelo painel gerencial do RH');
    // Como seu service ainda não tinha esse método geral, puxamos direto via fiação limpa
    return await this.chatService.listarTodasAsSalas();
  }

  // 🕒 2. HISTÓRICO DE CONVERSA: Carrega a linha do tempo cronológica de uma sala específica
  @Get('historico/:salaId')
  @HttpCode(HttpStatus.OK)
  async obterHistoricoDaSala(@Param('salaId', ParseIntPipe) salaId: number) {
    console.log(`📡 Rota GET /chat/historico/${salaId} acionada para carregar a linha do tempo`);
    return await this.chatService.carregarHistorico(salaId);
  }
}
