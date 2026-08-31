import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CriarColunaDTO } from './dtos/criar-coluna.dto';
import type { CriarCardDTO } from './dtos/criar-card.dto';
import type { MoverCardDTO } from './dtos/mover-card.dto';

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) { }

  // 1. ROTA DO ALUNO: Puxa o quadro isolando rigorosamente apenas as tarefas pessoais (Ignora cards de cursos do Admin)
  async obterQuadro(userId: number) {
    // Busca inicial no PostgreSQL
    let colunas = await this.prisma.kanbanColuna.findMany({
      where: { usuario_id: userId },
      include: {
        cards: {
          // Filtra para o Aluno ver APENAS os cards normais dele!
          where: { treinamento_id: null },
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { ordem: 'asc' },
    });

    // Se o array de colunas vier vazio, inicializa o quadro pessoal padrão do aluno
    if (colunas.length === 0) {

      await this.prisma.kanbanColuna.createMany({
        data: [
          { usuario_id: userId, titulo: '📌 A Fazer', ordem: 1 },
          { usuario_id: userId, titulo: '📖 Estudando', ordem: 2 },
          { usuario_id: userId, titulo: '✅ Concluído', ordem: 3 },
        ],
      });

      // Refaz a busca aplicando a mesma vacina de segurança
      colunas = await this.prisma.kanbanColuna.findMany({
        where: { usuario_id: userId },
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

  // 2. Cria uma nova coluna (Adaptada para aceitar a cor personalizada do Admin)
  async criarColuna(userId: number, dto: { titulo: string; cor?: string }) {
    const colunasContagem = await this.prisma.kanbanColuna.count({
      where: { usuario_id: userId },
    });

    return this.prisma.kanbanColuna.create({
      data: {
        usuario_id: userId,
        titulo: dto.titulo,
        ordem: colunasContagem + 1,
        cor: dto.cor || '#cbd5e1', // 🎨 Grava a cor selecionada pelo gestor no painel
      },
    });
  }

  // 3. Cria um cartão de tarefa dentro de uma coluna
  async criarCard(userId: number, dto: CriarCardDTO) {
    // Valida se a coluna pertence de verdade ao usuário logado
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

  // 4. Move o cartão (Arrastar e Soltar entre colunas ou mudar de posição)
  async moverCard(userId: number, cardId: number, dto: MoverCardDTO) {
    // Valida se o card existe
    const card = await this.prisma.kanbanCard.findUnique({
      where: { id: cardId },
      include: { coluna: true },
    });

    if (!card || card.coluna.usuario_id !== userId) {
      throw new ForbiddenException('Você não tem permissão para mover este card.');
    }

    // Altera a coluna e a ordem do card de forma simples no SQLite
    return this.prisma.kanbanCard.update({
      where: { id: cardId },
      data: {
        coluna_id: dto.colunaId,
        ordem: dto.ordem,
      },
    });
  }

  // 5. EXCLUSIVO DO GESTOR: Altera ou inicializa o card do curso no Kanban avançado de forma física
  async moverCardAdmin(cardIdOuTreinamentoId: number, dto: { colunaId: number; ordem: number }) {

    // 1. Tenta localizar o card pelo ID enviado
    let card = await this.prisma.kanbanCard.findUnique({
      where: { id: Number(cardIdOuTreinamentoId) }
    });

    // 2. Se não achou pelo ID do card, busca se existe algum card amarrado a esse ID como Treinamento!
    if (!card) {
      card = await this.prisma.kanbanCard.findFirst({
        where: { treinamento_id: Number(cardIdOuTreinamentoId) }
      });
    }

    // 3. Se o card existir, atualiza. Se não existir (curso órfão antigo), cria um novo na hora!
    if (card) {
      return this.prisma.kanbanCard.update({
        where: { id: card.id },
        data: {
          coluna_id: Number(dto.colunaId),
          ordem: dto.ordem ? Number(dto.ordem) : card.ordem
        }
      });
    } else {
      // Busca o treinamento para capturar o título oficial e carimbar no card novo
      const treinamento = await this.prisma.treinamento.findUnique({
        where: { id: Number(cardIdOuTreinamentoId) },
        select: { titulo: true, descricao: true }
      });

      if (!treinamento) {
        throw new NotFoundException('Treinamento/Projeto base não localizado no sistema.');
      }
      // Cria a linha física do cartão espelho vinculada ao curso no Postgres
      return this.prisma.kanbanCard.create({
        data: {
          coluna_id: Number(dto.colunaId),
          treinamento_id: Number(cardIdOuTreinamentoId),
          titulo: treinamento.titulo,
          descricao: treinamento.descricao || null,
          ordem: dto.ordem ? Number(dto.ordem) : 1
        }
      });
    }
  }

  async atualizarCardReal(id: number, dados: { titulo: string; descricao?: string }) {
    // Verifica se o card de fato existe antes de rodar a query
    const cardExistente = await this.prisma.kanbanCard.findUnique({ where: { id } });
    if (!cardExistente) {
      throw new NotFoundException('Tarefa não encontrada no ecossistema.');
    }

    return this.prisma.kanbanCard.update({
      where: { id },
      data: {
        titulo: dados.titulo,
        descricao: dados.descricao, // Salva string ou limpa se vier vazio
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
