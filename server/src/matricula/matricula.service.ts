import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatriculaService {
  constructor(private prisma: PrismaService) {}

  // 1. Cria a matrícula do usuário em um treinamento
  async matricular(userId: number, treinamentoId: number) {
    // Verifica se o treinamento existe e está ativo
    const treinamento = await this.prisma.treinamento.findUnique({
      where: { id: treinamentoId, ativo: true },
    });

    if (!treinamento) {
      throw new NotFoundException('Treinamento não encontrado ou inativo.');
    }

    // Verifica se o usuário já está matriculado
    const matriculaExistente = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
    });

    if (matriculaExistente) {
      throw new BadRequestException('Você já está matriculado neste treinamento.');
    }

    // Cria a matrícula
    return this.prisma.matricula.create({
      data: {
        usuario_id: userId,
        treinamento_id: treinamentoId,
        status: 'INICIADO',
        progresso: 0,
        iniciado_em: new Date(),
      },
    });
  }

  // 2. Busca os módulos e aulas de um treinamento que o usuário está matriculado
  async obterConteudoCurso(userId: number, treinamentoId: number) {
    // Valida se o usuário realmente tem direito/matrícula nesse curso
    const matricula = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
    });

    if (!matricula) {
      throw new BadRequestException('Você precisa estar matriculado para ver as aulas.');
    }

    // Retorna o treinamento trazendo módulos, aulas, materiais e o progresso do aluno nelas
    return this.prisma.treinamento.findUnique({
      where: { id: treinamentoId },
      include: {
        modulos: {
          orderBy: { ordem: 'asc' },
          include: {
            aulas: {
              orderBy: { ordem: 'asc' },
              include: {
                materiais: true,
                // Traz o progresso específico desta aula para esta matrícula
                progresso_aulas: {
                  where: { matricula_id: matricula.id },
                },
              },
            },
          },
        },
      },
    });
  }

  async atualizarProgressoAula(userId: number, aulaId: number, tempoAssistido: number, concluida: boolean) {
    // 1. Encontra a aula e descobre a qual treinamento ela pertence
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      include: {
        modulo: {
          select: { treinamento_id: true }
        }
      }
    });

    if (!aula || !aula.modulo?.treinamento_id) {
      throw new NotFoundException('Aula ou treinamento não localizado.');
    }

    const treinamentoId = aula.modulo.treinamento_id;

    // 2. Busca a matrícula ativa do usuário para esse treinamento
    const matricula = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
    });

    if (!matricula) {
      throw new BadRequestException('Usuário não está matriculado neste curso.');
    }

    // 3. Cria ou atualiza (upsert) o progresso específico desta aula
    // Como não temos um ID composto fácil no SQLite, buscamos se já existe o registro
    const progressoExistente = await this.prisma.progressoAula.findFirst({
      where: { matricula_id: matricula.id, aula_id: aulaId }
    });

    if (progressoExistente) {
      await this.prisma.progressoAula.update({
        where: { id: progressoExistente.id },
        data: {
          tempo_assistido: tempoAssistido,
          concluida: concluida,
          percentual: concluida ? 100 : 50, // Exemplo simples de percentual
          ultima_visualizacao: new Date()
        }
      });
    } else {
      await this.prisma.progressoAula.create({
        data: {
          matricula_id: matricula.id,
          aula_id: aulaId,
          tempo_assistido: tempoAssistido,
          concluida: concluida,
          percentual: concluida ? 100 : 50,
          ultima_visualizacao: new Date()
        }
      });
    }

    // 4. RECALCULO DO PROGRESSO GERAL DO CURSO
    // Conta quantas aulas o treinamento possui no total
    const totalAulas = await this.prisma.aula.count({
      where: { modulo: { treinamento_id: treinamentoId } }
    });

    // Conta quantas aulas o usuário já concluiu neste treinamento
    const aulasConcluidas = await this.prisma.progressoAula.count({
      where: {
        matricula_id: matricula.id,
        concluida: true
      }
    });

    // Calcula a porcentagem matemática de progresso
    const progressoGeral = totalAulas > 0 ? (aulasConcluidas / totalAulas) * 100 : 0;

    // Atualiza a tabela Matricula com a nova porcentagem e status se terminou
    const statusAtualizado = progressoGeral === 100 ? 'CONCLUIDO' : 'EM_ANDAMENTO';
    
    return this.prisma.matricula.update({
      where: { id: matricula.id },
      data: {
        progresso: parseFloat(progressoGeral.toFixed(2)), // Salva com 2 casas decimais (ex: 33.33)
        status: statusAtualizado,
        concluido_em: progressoGeral === 100 ? new Date() : null
      }
    });
  }

}
