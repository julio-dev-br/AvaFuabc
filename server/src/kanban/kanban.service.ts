import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CriarColunaDTO } from './dtos/criar-coluna.dto';
import type { CriarCardDTO } from './dtos/criar-card.dto';
import type { MoverCardDTO } from './dtos/mover-card.dto';

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) { }

  // Puxa o quadro isolando rigorosamente apenas as tarefas pessoais (Ignora cards de cursos do Admin)
  async obterQuadro(userId: number) {
    // 1. Busca inicial no PostgreSQL isolando estritamente os cartões normais do Aluno
    let colunas = await this.prisma.kanbanColuna.findMany({
      where: { usuario_id: userId, NOT: { titulo: { contains: 'Treinamento', mode: 'insensitive' } } },
      include: {
        cards: {
          where: { treinamento_id: null }, // 🌟 Aluno só gerencia tarefas que ele mesmo criou!
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { ordem: 'asc' },
    });

    // 2. SEED DE INFRAESTRUTURA AUTOMÁTICO: Se o banco resetou e veio vazio, monta o quadro clássico do Aluno!
    if (colunas.length === 0) {
      await this.prisma.kanbanColuna.createMany({
        data: [
          { usuario_id: userId, titulo: '📌 A Fazer', ordem: 1, cor: '#cbd5e1' },
          { usuario_id: userId, titulo: '📖 Estudando', ordem: 2, cor: '#3b82f6' },
          { usuario_id: userId, titulo: '✅ Concluído', ordem: 3, cor: '#10b981' },
        ],
      });

      // Refaz a busca consolidada garantindo a fiação limpa
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


  // Cria uma nova coluna (Adaptada para aceitar a cor personalizada do Admin)
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

  // Cria um cartão de tarefa dentro de uma coluna
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

  // Move o cartão (Arrastar e Soltar entre colunas ou mudar de posição)
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

  // Altera ou inicializa o card do curso no Kanban avançado de forma física
  // 🚀 MOVER CARD ADMIN DEFINITIVO: Recalcula o empilhamento matemático e blinda o Kanban contra resets de F5!
  // 🚀 MOVER CARD ADMIN INDESTRUTÍVEL: Localiza a coluna gerencial pela posição de ordem matemática global!
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

    // Confere se a coluna de destino enviada pelo front existe no banco de casa
    const colunaDestinoExiste = await this.prisma.kanbanColuna.findUnique({
      where: { id: colunaIdFinal }
    });

    // 🛡️ CORREÇÃO GLOBAL: Se der erro de ID pós-reset, busca a raia da 3ª posição da esteira (Cursos Publicados)
    if (!colunaDestinoExiste) {
      const raiaPublicadosReal = await this.prisma.kanbanColuna.findFirst({
        where: { ordem: 3 },
        orderBy: { id: 'asc' }
      });
      if (raiaPublicadosReal) {
        colunaIdFinal = raiaPublicadosReal.id;
      }
    }

    // Calcula a ordem matemática para empilhar organizadamente no fim da raia escolhida
    const contagemCardsDestino = await this.prisma.kanbanCard.count({
      where: { coluna_id: colunaIdFinal }
    });
    const ordemCalculada = contagemCardsDestino + 1;

    // Se o card já existir fisicamente, faz a atualização definitiva no Postgres
    if (card) {
      console.log(`📡 ARRASTAR KANBAN: Fixando Card [ID: ${card.id}] na Coluna [ID: ${colunaIdFinal}] na ordem [${ordemCalculada}]`);
      return this.prisma.kanbanCard.update({
        where: { id: card.id },
        data: {
          coluna_id: colunaIdFinal,
          ordem: ordemCalculada // ➔ Trava a posição de forma vitalícia no banco!
        }
      });
    } else {
      // Se for o clique inicial do botão "Finalizar e Publicar Curso", gera a linha física do cartão espelho
      const treinamento = await this.prisma.treinamento.findUnique({
        where: { id: Number(cardIdOuTreinamentoId) },
        select: { titulo: true, descricao: true }
      });

      if (!treinamento) {
        throw new NotFoundException('Treinamento de base não localizado no sistema.');
      }

      console.log(`📡 FABRICA DE CURSOS: Criando Card para o Curso ID [${cardIdOuTreinamentoId}] na Coluna [ID: ${colunaIdFinal}]`);
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
