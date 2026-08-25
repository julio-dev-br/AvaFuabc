import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CriarColunaDTO } from './dtos/criar-coluna.dto';
import type { CriarCardDTO } from './dtos/criar-card.dto';
import type { MoverCardDTO } from './dtos/mover-card.dto';

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) {}

  // 1. Puxa todo o quadro (Colunas + Cards) e inicializa automaticamente se for um aluno novo
  async obterQuadro(userId: number) {
    // Busca inicial no PostgreSQL
    let colunas = await this.prisma.kanbanColuna.findMany({
      where: { usuario_id: userId },
      include: {
        cards: {
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { ordem: 'asc' },
    });

    // 🌟 A MÁGICA AUTOMÁTICA: Se o array vier vazio, significa que é o primeiro acesso do colaborador!
    if (colunas.length === 0) {
      console.log(`=== 📋 KANBAN: INICIALIZANDO QUADRO AUTOMÁTICO PARA O USUÁRIO ID ${userId} ===`);

      // Cria as 3 colunas regulamentares em um bloco rápido no Postgres
      await this.prisma.kanbanColuna.createMany({
        data: [
          { usuario_id: userId, titulo: '📌 A Fazer', ordem: 1 },
          { usuario_id: userId, titulo: '📖 Estudando', ordem: 2 },
          { usuario_id: userId, titulo: '✅ Concluído', ordem: 3 },
        ],
      });

      // Refaz a busca para trazer a estrutura recém-criada limpa com os cards vazios []
      colunas = await this.prisma.kanbanColuna.findMany({
        where: { usuario_id: userId },
        include: {
          cards: {
            orderBy: { ordem: 'asc' },
          },
        },
        orderBy: { ordem: 'asc' },
      });
    }

    return colunas;
  }

  // 2. Cria uma nova coluna no quadro (A Fazer, Em Andamento...)
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
}
