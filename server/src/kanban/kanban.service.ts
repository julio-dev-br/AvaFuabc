import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CriarColunaDTO } from './dtos/criar-coluna.dto';
import type { CriarCardDTO } from './dtos/criar-card.dto';
import type { MoverCardDTO } from './dtos/mover-card.dto';

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) { }


  async obterQuadro(userId: number) {
    let colunas = await this.prisma.kanbanColuna.findMany({
      where: { usuario_id: userId, NOT: { titulo: { contains: 'Treinamento', mode: 'insensitive' } } },
      include: {
        cards: {
          where: { treinamento_id: null }, 
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { ordem: 'asc' },
    });

    if (colunas.length === 0) {
      await this.prisma.kanbanColuna.createMany({
        data: [
          { usuario_id: userId, titulo: '📌 A Fazer', ordem: 1, cor: '#cbd5e1' },
          { usuario_id: userId, titulo: '📖 Estudando', ordem: 2, cor: '#3b82f6' },
          { usuario_id: userId, titulo: '✅ Concluído', ordem: 3, cor: '#10b981' },
        ],
      });

      colunas = await this.prisma.kanbanColuna.findMany({
        where: { usuario_id: userId, NOT: { titulo: { contains: 'Treinamento', mode: 'insensitive' } } },
        include: {
          cards: {
            where: { treinamento_id: null },
            orderBy: { ordem: 'asc' },
          },
        },
        orderBy: { ordem: 'asc' },
      });
    }

    return colunas;
  }


  async criarColuna(userId: number, dto: { titulo: string; cor?: string }) {
    const colunasContagem = await this.prisma.kanbanColuna.count({
      where: { usuario_id: userId },
    });

    return this.prisma.kanbanColuna.create({
      data: {
        usuario_id: userId,
        titulo: dto.titulo,
        ordem: colunasContagem + 1,
        cor: dto.cor || '#cbd5e1', 
      },
    });
  }


  async criarCard(userId: number, dto: CriarCardDTO) {
    const coluna = await this.prisma.kanbanColuna.findUnique({
      where: { id: dto.colunaId },
    });

    if (!coluna || coluna.usuario_id !== userId) {
      throw new ForbiddenException('Você não tem permissão para adicionar cards nesta coluna.');
    }

    const cardsContagem = await this.prisma.kanbanCard.count({
      where: { coluna_id: dto.colunaId },
    });

    return this.prisma.kanbanCard.create({
      data: {
        coluna_id: dto.colunaId,
        titulo: dto.titulo,
        descricao: dto.descricao || null,
        data_entrega: dto.dataEntrega ? new Date(dto.dataEntrega) : null,
        ordem: cardsContagem + 1,
      },
    });
  }


  async moverCard(userId: number, cardId: number, dto: MoverCardDTO) {

    const card = await this.prisma.kanbanCard.findUnique({
      where: { id: cardId },
      include: { coluna: true },
    });

    if (!card || card.coluna.usuario_id !== userId) {
      throw new ForbiddenException('Você não tem permissão para mover este card.');
    }

    return this.prisma.kanbanCard.update({
      where: { id: cardId },
      data: {
        coluna_id: dto.colunaId,
        ordem: dto.ordem,
      },
    });
  }


  async moverCardAdmin(cardIdOuTreinamentoId: number, dto: { colunaId: number; ordem: number }) {
    let card = await this.prisma.kanbanCard.findUnique({
      where: { id: Number(cardIdOuTreinamentoId) }
    });

    if (!card) {
      card = await this.prisma.kanbanCard.findFirst({
        where: { treinamento_id: Number(cardIdOuTreinamentoId) }
      });
    }

    let colunaIdFinal = Number(dto.colunaId);


    const colunaDestinoExiste = await this.prisma.kanbanColuna.findUnique({
      where: { id: colunaIdFinal }
    });

    if (!colunaDestinoExiste) {
      const raiaPublicadosReal = await this.prisma.kanbanColuna.findFirst({
        where: { ordem: 3 },
        orderBy: { id: 'asc' }
      });
      if (raiaPublicadosReal) {
        colunaIdFinal = raiaPublicadosReal.id;
      }
    }


    const contagemCardsDestino = await this.prisma.kanbanCard.count({
      where: { coluna_id: colunaIdFinal }
    });
    const ordemCalculada = contagemCardsDestino + 1;


    if (card) {
      return this.prisma.kanbanCard.update({
        where: { id: card.id },
        data: {
          coluna_id: colunaIdFinal,
          ordem: ordemCalculada 
        }
      });
    } else {

      const treinamento = await this.prisma.treinamento.findUnique({
        where: { id: Number(cardIdOuTreinamentoId) },
        select: { titulo: true, descricao: true }
      });

      if (!treinamento) {
        throw new NotFoundException('Treinamento de base não localizado no sistema.');
      }

      
      return this.prisma.kanbanCard.create({
        data: {
          coluna_id: colunaIdFinal,
          treinamento_id: Number(cardIdOuTreinamentoId),
          titulo: treinamento.titulo,
          descricao: treinamento.descricao || null,
          ordem: ordemCalculada
        }
      });
    }
  }

  async atualizarCardReal(id: number, dados: { titulo: string; descricao?: string }) {
    const cardExistente = await this.prisma.kanbanCard.findUnique({ where: { id } });
    if (!cardExistente) {
      throw new NotFoundException('Tarefa não encontrada no ecossistema.');
    }

    return this.prisma.kanbanCard.update({
      where: { id },
      data: {
        titulo: dados.titulo,
        descricao: dados.descricao, 
      },
    });
  }

  async excluirCardReal(id: number) {
    const cardExistente = await this.prisma.kanbanCard.findUnique({ where: { id } });
    if (!cardExistente) {
      throw new NotFoundException('Tarefa não encontrada para exclusão.');
    }

    await this.prisma.kanbanCard.delete({
      where: { id },
    });

    return { message: 'Tarefa removida com sucesso do banco de dados!' };
  }
}
