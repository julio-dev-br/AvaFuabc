import { Controller, Get, Param, ParseIntPipe, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('chat')
@UseGuards(AuthGuard) 
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('salas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager') 
  @HttpCode(HttpStatus.OK)
  async listarSalasAtivas() {
    
    return await this.chatService.listarTodasAsSalas();
  }

  @Get('historico/:salaId')
  @HttpCode(HttpStatus.OK)
  async obterHistoricoDaSala(@Param('salaId', ParseIntPipe) salaId: number) {
    
    return await this.chatService.carregarHistorico(salaId);
  }
}
