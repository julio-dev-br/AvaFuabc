import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CriarTopicoDTO } from './dtos/criar-topico.dto';
import type { CriarRespostaDTO } from './dtos/criar-resposta.dto';

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  // 1. Abre um novo tópico de discussão
  async criarTopico(userId: number, dto: CriarTopicoDTO) {
    return this.prisma.topicoForum.create({
      data: {
        usuario_id: userId,
        aula_id: dto.aulaId || null,
        titulo: dto.titulo,
        conteudo: dto.conteudo,
      },
    });
  }

  // 2. Lista os tópicos vinculados a uma aula específica
  async listarTopicosPorAula(aulaId: number) {
    return this.prisma.topicoForum.findMany({
      where: { aula_id: aulaId },
      include: {
        autor: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: { respostas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Abre um tópico específico trazendo todas as suas respostas ordenadas
  async obterTopicoComRespostas(topicoId: number) {
    const topico = await this.prisma.topicoForum.findUnique({
      where: { id: topicoId },
      include: {
        autor: { select: { id: true, name: true, role: true } },
        respostas: {
          include: {
            autor: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!topico) {
      throw new NotFoundException('Tópico de discussão não encontrado.');
    }

    return topico;
  }

  // 4. Adiciona uma resposta a um tópico existente
  async responderTopico(userId: number, topicoId: number, dto: CriarRespostaDTO) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isTutor = user?.role === 'admin' || user?.role === 'manager';

    const topicoExiste = await this.prisma.topicoForum.findUnique({ where: { id: topicoId } });
    if (!topicoExiste) {
      throw new NotFoundException('O tópico que você está tentando responder não existe.');
    }

    return this.prisma.respostaForum.create({
      data: {
        topico_id: topicoId,
        usuario_id: userId,
        conteudo: dto.conteudo,
        is_tutor: isTutor,
      },
    });
  }
}
