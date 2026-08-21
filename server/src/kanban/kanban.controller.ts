import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CriarColunaDTO } from './dtos/criar-coluna.dto';
import type { CriarCardDTO } from './dtos/criar-card.dto';
import type { MoverCardDTO } from './dtos/mover-card.dto';

@Controller('kanban')
@UseGuards(AuthGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  // 1. Obter o quadro completo: GET /kanban
  @Get()
  async obterQuadro(@CurrentUser() user: { id: number }) {
    return this.kanbanService.obterQuadro(user.id);
  }

  // 2. Criar uma nova coluna: POST /kanban/colunas
  @Post('colunas')
  async criarColuna(@CurrentUser() user: { id: number }, @Body() body: CriarColunaDTO) {
    return this.kanbanService.criarColuna(user.id, body);
  }

  // 3. Criar um novo cartão: POST /kanban/cards
  @Post('cards')
  async criarCard(@CurrentUser() user: { id: number }, @Body() body: CriarCardDTO) {
    return this.kanbanService.criarCard(user.id, body);
  }

  // 4. Mover ou reordenar um cartão: PATCH /kanban/cards/:id/mover
  @Patch('cards/:id/mover')
  async moverCard(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) cardId: number,
    @Body() body: MoverCardDTO,
  ) {
    return this.kanbanService.moverCard(user.id, cardId, body);
  }
}
