import { Controller, Post, Get, Param, ParseIntPipe, UseGuards, Body, Patch } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ProgressoAulaDTO } from './dtos/progresso-aula.dto';
import type  { CriarMatriculaDTO } from './dtos/criar-matricula.dto';

@Controller() // Deixamos o prefixo aberto para usar o plural por rota
@UseGuards(AuthGuard)
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) { }

  // 1 - Rota de Matrícula Atualizada com DTO
  @Post('matriculas')
  async matricular(
    @CurrentUser() user: { id: number },
    @Body() body: CriarMatriculaDTO, // Recebe o objeto JSON completo
  ) {
    return this.matriculaService.matricular(user.id, body.treinamentoId);
  }

  // 2. Ver as aulas do curso que estou matriculado
  @Get('matriculas/treinamentos/:id/conteudo')
  async obterConteudo(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) treinamentoId: number,
  ) {
    return this.matriculaService.obterConteudoCurso(user.id, treinamentoId);
  }

  // 3. Atualizar o progresso de uma aula assistida
  @Patch('aulas/:id/progresso')
  async atualizarProgresso(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) aulaId: number,
    @Body() body: ProgressoAulaDTO
  ) {
    return this.matriculaService.atualizarProgressoAula(
      user.id,
      aulaId,
      body.tempoAssistido,
      body.concluida
    );
  }
}
