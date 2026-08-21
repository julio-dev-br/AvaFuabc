import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificacoesService } from './motificacoes.service';

@Controller('notificacoes')
@UseGuards(AuthGuard) // Garante que apenas usuários autenticados chamem essa API
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  // ROTA: GET /notificacoes (Busca alertas não lidos do aluno)
  @Get()
  async obterNotificacoes(@CurrentUser() user: any) {
    return this.service.listarDoUsuario(user.id);
  }

  // ROTA: PATCH /notificacoes/:id/ler (Marca o alerta como lido)
  @Patch(':id/ler')
  async lerNotificacao(@Param('id') id: string) {
    return this.service.marcarComoLida(Number(id));
  }
}
