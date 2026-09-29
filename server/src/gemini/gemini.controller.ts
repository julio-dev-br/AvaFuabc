import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('gerar-quiz')
  @HttpCode(HttpStatus.OK)
  // 🌟 CORRIGIDO: Tipado explicitamente como Promise<any[]> para casar com o Service!
  async gerarQuizAutomatico(@Body('texto') texto: string): Promise<any[]> {
    return await this.geminiService.gerarQuestoesQuiz(texto);
  }
}
