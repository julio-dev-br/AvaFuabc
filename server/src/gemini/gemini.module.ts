import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';

@Module({
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService], // 🌟 O SEGREDO DO CHAVEAMENTO: Permite que outros módulos usem a IA se quiserem!
})
export class GeminiModule {}
