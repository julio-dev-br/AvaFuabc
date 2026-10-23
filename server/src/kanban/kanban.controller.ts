import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards, Delete, Put } from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CriarColunaDTO } from './dtos/criar-coluna.dto';
import type { CriarCardDTO } from './dtos/criar-card.dto';
import type { MoverCardDTO } from './dtos/mover-card.dto';

@Controller('kanban')
@UseGuards(AuthGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) { }

  // Obter o quadro completo: GET /kanban
  @Get()
  async obterQuadro(@CurrentUser() user: { id: number }) {
    return this.kanbanService.obterQuadro(user.id);
  }

  @Post('colunas')
  async criarColuna(@CurrentUser() user: { id: number }, @Body() body: CriarColunaDTO) {
    return this.kanbanService.criarColuna(user.id, body);
  }

  @Post('cards')
  async criarCard(@CurrentUser() user: { id: number }, @Body() body: CriarCardDTO) {
    return this.kanbanService.criarCard(user.id, body);
  }

  @Patch('cards/:id/mover')
  async moverCard(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) cardId: number,
    @Body() body: MoverCardDTO,
  ) {
    return this.kanbanService.moverCard(user.id, cardId, body);
  }

  @Patch('admin/mover-card/:id')
  async moverCardAdmin(
    @Param('id', ParseIntPipe) cardId: number,
    @Body() corpo: { colunaId: number; ordem: number },
  ) {
    return this.kanbanService.moverCardAdmin(cardId, corpo);
  }

  @Put('cards/:id')
  async atualizarCard(
    @Param('id', ParseIntPipe) id: number,
    @Body() dados: { titulo: string; descricao?: string },
  ) {
    return this.kanbanService.atualizarCardReal(id, dados);
  }

  @Delete('cards/:id')
  async excluirCard(@Param('id', ParseIntPipe) id: number) {
    return this.kanbanService.excluirCardReal(id);
  }
}
