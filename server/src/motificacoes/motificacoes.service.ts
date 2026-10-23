import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) { }

  async listarDoUsuario(usuarioId: number) {
    return this.prisma.notification.findMany({
      where: {
        usuario_id: Number(usuarioId),
        lida: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }


  async marcarComoLida(notificacaoId: number) {
    const notificacao = await this.prisma.notification.findUnique({
      where: { id: Number(notificacaoId) },
    });

    if (!notificacao) {
      throw new NotFoundException('Notificação não localizada no banco de dados.');
    }

    return this.prisma.notification.update({
      where: { id: Number(notificacaoId) },
      data: { lida: true },
    });
  }

  async dispararComunicadoEmMassa(dados: { escopo: string; referenciaId?: number; titulo: string; mensagem: string }) {
    const { escopo, referenciaId, titulo, mensagem } = dados;

    const filtroUsuario: any = { ativo: true };

    if (escopo === 'EMPRESA' && referenciaId) filtroUsuario.empresa_id = BigInt(referenciaId);
    if (escopo === 'UNIDADE' && referenciaId) filtroUsuario.unidade_id = BigInt(referenciaId);
    if (escopo === 'DEPARTAMENTO' && referenciaId) filtroUsuario.departamento_id = BigInt(referenciaId);

    const usuariosAlvo = await this.prisma.user.findMany({
      where: filtroUsuario,
      select: { id: true }
    });

    if (usuariosAlvo.length === 0) {
      return {
        sucesso: false,
        totalEnviados: 0,
        mensagem: 'Nenhum colaborador ativo foi localizado para o escopo organizacional selecionado.'
      };
    }


    const cargaNotificacoes = usuariosAlvo.map(usuario => ({
      usuario_id: usuario.id,
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      lida: false
    }));

    await this.prisma.notification.createMany({
      data: cargaNotificacoes
    });

    return {
      sucesso: true,
      totalEnviados: usuariosAlvo.length,
      mensagem: `Comunicado institucional disparado com sucesso para ${usuariosAlvo.length} colaboradores!`
    };
  }


  async listarHistoricoAdmin() {

    const notificacoes = await this.prisma.notification.findMany({
      distinct: ['titulo', 'mensagem'],
      select: {
        id: true,
        titulo: true,
        mensagem: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return notificacoes;
  }

}
