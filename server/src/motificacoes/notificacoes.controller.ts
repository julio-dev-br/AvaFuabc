import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificacoesService } from './motificacoes.service'; 

@Controller('notificacoes')
@UseGuards(AuthGuard) 
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) { }

  @Get()
  async obterNotificacoes(@CurrentUser() usuario: any) {
    return this.notificacoesService.listarDoUsuario(usuario.id);
  }

  @Patch(':id/ler')
  async lerNotificacao(@Param('id') id: string) {
    return this.notificacoesService.marcarComoLida(Number(id));
  }

  @Post('admin/disparar')
  async dispararComunicado(
    @Body() corpoRequisicao: { escopo: string; referenciaId?: number; titulo: string; mensagem: string }
  ) {
    
    const dadosFormatados = {
      escopo: corpoRequisicao.escopo,
      referenciaId: corpoRequisicao.referenciaId ? Number(corpoRequisicao.referenciaId) : undefined,
      titulo: corpoRequisicao.titulo,
      mensagem: corpoRequisicao.mensagem
    };

    return this.notificacoesService.dispararComunicadoEmMassa(dadosFormatados);
  }

  @Get('admin/historico')
  async obterHistoricoAdmin() {
    return this.notificacoesService.listarHistoricoAdmin(); 
  }

}
