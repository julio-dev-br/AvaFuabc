import { Controller, Get, Post, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ResponderQuizDTO } from './dtos/responder-quiz.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('quizzes')
@UseGuards(AuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) { }

  // 1. Pegar o questionário de uma aula: GET /quizzes/aula/4
  @Get('aula/:id')
  async obterPorAula(@Param('id', ParseIntPipe) aulaId: number) {
    return this.quizzesService.obterQuizPorAula(aulaId);
  }

  // 2. Enviar o gabarito do aluno: POST /quizzes/1/respostas
  // 🌟 AJUSTADO: Alinha o endereço exato para casar com o Angular (/quizzes/:id/responder)
  @Post(':id/responder')
  async responder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) quizId: number,
    @Body() body: any, // ➔ Mudado para 'any' para aceitar o payload com aulaId e respostas
  ) {
    return this.quizzesService.responderQuiz(user.id, quizId, body);
  }


  @Post('admin/criar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async criarQuizCompleto(
    @Body() body: {
      aulaId: number;
      titulo: string;
      notaMinima: number;
      perguntas: {
        pergunta: string;
        alternativas: { descricao: string; isCorreta: boolean }[];
      }[];
    }
  ) {
    return this.quizzesService.criarQuizCompleto(body);
  }
}

