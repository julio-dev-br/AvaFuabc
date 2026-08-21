import { Controller, Get, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { CertificadosService } from './certificados.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Response } from 'express';

@Controller('certificados')
@UseGuards(AuthGuard)
export class CertificadosController {
  constructor(private readonly certificadosService: CertificadosService) {}

  // Endpoint para baixar o PDF: GET /certificados/treinamento/4
  @Get('treinamento/:id')
  async baixarCertificado(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) treinamentoId: number,
    @Res() res: Response // Injeta o objeto de resposta do Express para download de arquivos
  ) {
    return this.certificadosService.gerarPdfCertificado(user.id, treinamentoId, res);
  }
}
