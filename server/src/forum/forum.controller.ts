import { Controller, Get, Post, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ForumService } from './forum.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CriarTopicoDTO } from './dtos/criar-topico.dto';
import type { CriarRespostaDTO } from './dtos/criar-resposta.dto';

@Controller('forum')
@UseGuards(AuthGuard) // Bloqueia acessos anônimos em todo o fórum
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // 1. Criar uma nova dúvida/tópico: POST /forum/topicos
  @Post('topicos')
  async criarTopico(@CurrentUser() user: { id: number }, @Body() body: CriarTopicoDTO) {
    return this.forumService.criarTopico(user.id, body);
  }

  // 2. Buscar discussões de uma aula específica: GET /forum/aulas/4/topicos
  @Get('aulas/:id/topicos')
  async listarPorAula(@Param('id', ParseIntPipe) aulaId: number) {
    return this.forumService.listarTopicosPorAula(aulaId);
  }

  // 3. Ver detalhes de uma discussão e suas respostas: GET /forum/topicos/1
  @Get('topicos/:id')
  async obterDetalhes(@Param('id', ParseIntPipe) topicoId: number) {
    return this.forumService.obterTopicoComRespostas(topicoId);
  }

  // 4. Enviar uma resposta a uma dúvida: POST /forum/topicos/1/respostas
  @Post('topicos/:id/respostas')
  async responderTopico(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) topicoId: number,
    @Body() body: CriarRespostaDTO,
  ) {
    return this.forumService.responderTopico(user.id, topicoId, body);
  }
}
