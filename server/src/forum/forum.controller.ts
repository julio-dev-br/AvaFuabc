import { Controller, Get, Post, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ForumService } from './forum.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CriarTopicoDTO } from './dtos/criar-topico.dto';
import type { CriarRespostaDTO } from './dtos/criar-resposta.dto';

@Controller('forum')
@UseGuards(AuthGuard) 
export class ForumController {
  constructor(private readonly forumService: ForumService) {}


  @Post('topicos')
  async criarTopico(@CurrentUser() user: { id: number }, @Body() body: CriarTopicoDTO) {
    return this.forumService.criarTopico(user.id, body);
  }


  @Get('aulas/:id/topicos')
  async listarPorAula(@Param('id', ParseIntPipe) aulaId: number) {
    return this.forumService.listarTopicosPorAula(aulaId);
  }

  @Get('topicos/:id')
  async obterDetalhes(@Param('id', ParseIntPipe) topicoId: number) {
    return this.forumService.obterTopicoComRespostas(topicoId);
  }

  @Post('topicos/:id/respostas')
  async responderTopico(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) topicoId: number,
    @Body() body: CriarRespostaDTO,
  ) {
    return this.forumService.responderTopico(user.id, topicoId, body);
  }
}
