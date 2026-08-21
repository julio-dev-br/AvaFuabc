import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificacoesService } from './motificacoes.service'; // Mantido conforme seu arquivo físico

@Controller('notificacoes')
@UseGuards(AuthGuard) // Blindagem de segurança: Só colaboradores logados acessam
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  // 👤 ROTA DO ALUNO: GET /notificacoes (Alimenta o sininho do cabeçalho)
  @Get()
  async obterNotificacoes(@CurrentUser() usuario: any) {
    return this.notificacoesService.listarDoUsuario(usuario.id);
  }

  // 👤 ROTA DO ALUNO: PATCH /notificacoes/:id/ler (Zera a bolinha vermelha do badge)
  @Patch(':id/ler')
  async lerNotificacao(@Param('id') id: string) {
    return this.notificacoesService.marcarComoLida(Number(id));
  }

  // 💼 ROTA DO GESTOR: POST /notificacoes/admin/disparar (Envio em massa Protheus)
  @Post('admin/disparar')
  async dispararComunicado(
    @Body() corpoRequisicao: { escopo: string; referenciaId?: number; titulo: string; mensagem: string }
  ) {
    // Garante a conversão numérica de segurança do ID organizacional antes de tocar o Prisma
    const dadosFormatados = {
      escopo: corpoRequisicao.escopo,
      referenciaId: corpoRequisicao.referenciaId ? Number(corpoRequisicao.referenciaId) : undefined,
      titulo: corpoRequisicao.titulo,
      mensagem: corpoRequisicao.mensagem
    };

    return this.notificacoesService.dispararComunicadoEmMassa(dadosFormatados);
  }
}
