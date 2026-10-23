import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

 
  async obterOuCriarSala(usuarioId: number, nomeUsuario: string) {
    let sala = await this.prisma.salaChat.findFirst({
      where: { usuario_id: usuarioId, aberto: true },
    });

    if (!sala) {
      sala = await this.prisma.salaChat.create({
        data: {
          usuario_id: usuarioId,
          titulo: `Suporte Técnico - ${nomeUsuario}`,
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

    return this.prisma.mensagemChat.create({
      data: {
        sala_id: Number(salaId),
        usuario_id: Number(usuarioId),
        conteudo: conteudo.trim(),
        is_tutor: isTutor,
      },
      include: {
        user: { select: { name: true, avatar_url: true } },
      },
    });
  }


  async carregarHistorico(salaId: number) {
    return this.prisma.mensagemChat.findMany({
      where: { sala_id: salaId },
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
          select: { mensagens: true } 
        }
      },
    });
  }

}
