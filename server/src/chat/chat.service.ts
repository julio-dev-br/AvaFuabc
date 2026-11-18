import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async obterOuCriarSala(usuarioId: number, nomeUsuario: string) {
    const idLimpo = Number(usuarioId);

    if (!idLimpo || isNaN(idLimpo)) {
      throw new BadRequestException('ID de usuário inválido para iniciar o chat.');
    }

    // Valida se o usuário existe no banco atual (evita erro de FK com sessões antigas)
    const usuarioExiste = await this.prisma.user.findUnique({
      where: { id: idLimpo },
      select: { id: true, name: true },
    });

    if (!usuarioExiste) {
      throw new BadRequestException(
        'Sessão expirada ou usuário não encontrado. Faça login novamente.'
      );
    }

    let sala = await this.prisma.salaChat.findFirst({
      where: { usuario_id: idLimpo, aberto: true },
    });

    if (!sala) {
      const nomeExibicao = nomeUsuario?.trim() || usuarioExiste.name || 'Colaborador';
      sala = await this.prisma.salaChat.create({
        data: {
          usuario_id: idLimpo,
          titulo: `Suporte Técnico - ${nomeExibicao}`,
          aberto: true,
        },
      });
    }

    return sala;
  }

  async registrarMensagem(salaId: number, usuarioId: number, conteudo: string, isTutor: boolean) {
    if (!conteudo || !conteudo.trim()) {
      throw new BadRequestException('O conteúdo da mensagem não pode estar vazio.');
    }

    const salaIdNum = Number(salaId);
    const usuarioIdNum = Number(usuarioId);

    const mensagem = await this.prisma.mensagemChat.create({
      data: {
        sala_id: salaIdNum,
        usuario_id: usuarioIdNum,
        conteudo: conteudo.trim(),
        is_tutor: isTutor,
      },
      include: {
        user: { select: { name: true, avatar_url: true } },
      },
    });

    // Atualiza o timestamp da sala para manter as mais recentes no topo do painel do RH
    await this.prisma.salaChat.update({
      where: { id: salaIdNum },
      data: { updated_at: new Date() },
    });

    return mensagem;
  }

  async carregarHistorico(salaId: number) {
    return this.prisma.mensagemChat.findMany({
      where: { sala_id: Number(salaId) },
      orderBy: { created_at: 'asc' },
      include: {
        user: { select: { name: true, avatar_url: true } },
      },
    });
  }

  async listarTodasAsSalas() {
    return this.prisma.salaChat.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
        _count: {
          select: { mensagens: true },
        },
      },
    });
  }
}
