import { Controller, Get, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { CertificadosService } from './certificados.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Response } from 'express';

@Controller('certificados')
// 🚀 LIBERADO: Removido o Guard global da classe para permitir métodos públicos!
export class CertificadosController {
  constructor(private readonly certificadosService: CertificadosService) { }

  //ROTA PRIVADA DO ALUNO (Download do PDF dentro do Portal)
  // 🚀 ATUALIZADO: O Guard foi movido para cá, protegendo individualmente esta rota com o accessToken!
  @Get('treinamento/:id')
  @UseGuards(AuthGuard)
  async baixarCertificado(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) treinamentoId: number,
    @Res() res: Response // Injeta o objeto de resposta do Express para download de arquivos
  ) {
    return this.certificadosService.gerarPdfCertificado(user.id, treinamentoId, res);
  }
  // Rota: GET /certificados/publico/validar/:codigo
  @Get('publico/validar/:codigo')
  async validarCertificadoPublico(@Param('codigo') codigo: string, @Res() res: Response) {
    try {
      // 1. Busca os metadados reais do Postgres usando a service vacinada contra null
      const dados = await this.certificadosService.validarTokenCertificado(codigo);
      
      const dataBruta = dados.emitidoEm ? String(dados.emitidoEm) : new Date().toISOString();
      const dataEmissao = new Date(dataBruta).toLocaleDateString('pt-BR');

      // 2. Cospe o HTML com Estilos Incorporados Nativo (Sem dependências externas de CDN!)
      const htmlVisual = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Validador de Conformidade - FUABC</title>
          <style>
            body {
              background-color: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: screen;
              height: 100vh;
              margin: 0;
              padding: 16px;
              box-sizing: border-box;
            }
            .card {
              max-width: 440px;
              width: 100%;
              background-color: #ffffff;
              border-radius: 16px;
              border: 1px solid #10b981;
              border-top: 8px solid #047857;
              box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.1), 0 8px 10px -6px rgba(16, 185, 129, 0.1);
              overflow: hidden;
              box-sizing: border-box;
            }
            .card-content {
              padding: 32px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .icon-container {
              width: 64px;
              height: 64px;
              background-color: #ecfdf5;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 16px;
            }
            .icon-svg {
              width: 40px;
              height: 40px;
              fill: #059669;
            }
            h2 {
              font-size: 22px;
              font-weight: 800;
              color: #1e293b;
              margin: 0 0 4px 0;
              letter-spacing: -0.5px;
            }
            .badge {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #059669;
              margin-bottom: 24px;
            }
            .grid-container {
              width: 100%;
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #f1f5f9;
              padding: 20px;
              text-align: left;
              box-sizing: border-box;
              margin-bottom: 24px;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .field-group {
              display: flex;
              flex-direction: column;
            }
            .grid-2-col {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #94a3b8;
              margin-bottom: 4px;
            }
            .value {
              font-size: 14px;
              font-weight: 700;
              color: #334155;
            }
            .value-highlight {
              font-size: 14px;
              font-weight: 800;
              color: #003366;
            }
            .value-mono {
              font-size: 13px;
              font-family: monospace;
              font-weight: 700;
              color: #475569;
            }
            .divider {
              border-top: 1px solid #e2e8f0;
              margin: 4px 0;
            }
            .footer-title {
              font-size: 12px;
              font-weight: 800;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin: 0 0 2px 0;
            }
            .footer-sub {
              font-size: 10px;
              font-weight: 600;
              color: #cbd5e1;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-content">
              
              <!-- Escudo SVG Nativo de Sucesso (Inviolável e Offline!) -->
              <div class="icon-container">
                <svg class="icon-svg" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              
              <h2>Documento Autenticado</h2>
              <div class="badge">${dados.mensagem}</div>
              
              <!-- Painel de Metadados -->
              <div class="grid-container">
                <div class="field-group">
                  <span class="label">Colaborador</span>
                  <span class="value">${dados.colaborador}</span>
                </div>
                
                <div class="grid-2-col">
                  <div class="field-group">
                    <span class="label">Matrícula Protheus</span>
                    <span class="value-mono">${dados.refeferenciaMatricula}</span>
                  </div>
                  <div class="field-group">
                    <span class="label">Código Validação</span>
                    <span class="value-mono">${codigo}</span>
                  </div>
                </div>
                
                <div class="divider"></div>
                
                <div class="field-group">
                  <span class="label">Treinamento Regulamentar</span>
                  <span class="value-highlight">${dados.treinamento}</span>
                </div>
                
                <div class="grid-2-col">
                  <div class="field-group">
                    <span class="label">Carga Horária</span>
                    <span class="value">${dados.cargaHoraria}</span>
                  </div>
                  <div class="field-group">
                    <span class="label">Emitido Em</span>
                    <span class="value">${dataEmissao}</span>
                  </div>
                </div>
              </div>

              <!-- Rodapé Institucional -->
              <div>
                <p class="footer-title">Fundação do ABC</p>
                <p class="footer-sub">Sistema Seguro de Gestão de Conformidade e Riscos</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;
      
      return res.status(200).send(htmlVisual);

    } catch (error) {
      // 🚨 CASO DE FRAUDE: Interface vermelha nativa de aviso de segurança
      const htmlErro = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aviso de Segurança - FUABC</title>
          <style>
            body { background-color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
            .card { max-width: 440px; width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e11d48; border-top: 8px solid #b91c1c; box-shadow: 0 10px 25px rgba(225,29,72,0.1); overflow: hidden; }
            .card-content { padding: 32px; display: flex; flex-direction: column; align-items: center; text-align: center; }
            .icon-container { width: 64px; height: 64px; background-color: #fff1f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
            .icon-svg { width: 40px; height: 40px; fill: #e11d48; }
            h2 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; }
            p { color: #e11d48; font-size: 14px; font-weight: 600; line-height: 1.5; margin: 0 0 24px 0; }
            .footer-title { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 2px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-content">
              <div class="icon-container">
                <svg class="icon-svg" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h2>Documento Inválido</h2>
              <p>Atenção: Este token ou código de autenticidade não consta nos registros regulamentares oficiais da FUABC.</p>
              <div style="border-top: 1px solid #f1f5f9; pt-4: 16px; width: 100%;">
                <p class="footer-title" style="color: #94a3b8; margin-top: 16px;">Fundação do ABC</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      return res.status(404).send(htmlErro);
    }
  }
}
