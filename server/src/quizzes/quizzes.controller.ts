import { Controller, Get, Post, Param, Body, ParseIntPipe, UseGuards, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Get('aula/:id')
  async obterPorAula(@Param('id', ParseIntPipe) aulaId: number) {
    return this.quizzesService.obterQuizPorAula(aulaId);
  }

  @Post(':id/responder')
  async responder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) quizId: number,
    @Body() body: any,
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

  @Post('admin/criar-gerado-ia')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async salvarQuizPorIA(
    @Body() payload: {
      aulaId: number;
      titulo: string;
      notaMinima?: number;
      tentativas?: number;
      perguntas: any[];
    }
  ) {
    if (!payload.aulaId || !payload.perguntas || payload.perguntas.length === 0) {
      throw new BadRequestException('Payload incompleto. O campo aulaId e o array de perguntas são obrigatórios.');
    }

    return await this.quizzesService.salvarQuizGeradoPorIA(payload);
  }
}
