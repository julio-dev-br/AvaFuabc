import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatriculaService {
  constructor(private prisma: PrismaService) { }

  async matricular(userId: number, treinamentoId: number) {

    const treinamento = await this.prisma.treinamento.findUnique({
      where: { id: treinamentoId, ativo: true },
    });

    if (!treinamento) {
      throw new NotFoundException('Treinamento não encontrado ou inativo.');
    }

    const matriculaExistente = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
    });

    if (matriculaExistente) {
      throw new BadRequestException('Você já está matriculado neste treinamento.');
    }

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

  async obterConteudoCurso(userId: number, treinamentoId: number) {

    const matricula = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
    });

    if (!matricula) {
      throw new BadRequestException('Você precisa estar matriculado para ver as aulas.');
    }

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

    const matricula = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
    });

    if (!matricula) {
      throw new BadRequestException('Usuário não está matriculado neste curso.');
    }

    const progressoExistente = await this.prisma.progressoAula.findFirst({
      where: { matricula_id: matricula.id, aula_id: aulaId }
    });

    if (progressoExistente) {
      await this.prisma.progressoAula.update({
        where: { id: progressoExistente.id },
        data: {
          tempo_assistido: tempoAssistido,
          concluida: concluida,
          percentual: tempoAssistido,
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
          percentual: tempoAssistido,
          ultima_visualizacao: new Date()
        }
      });
    }

    const totalAulas = await this.prisma.aula.count({
      where: { modulo: { treinamento_id: treinamentoId } }
    });

    const somaDosPercentuais = await this.prisma.progressoAula.aggregate({
      where: { matricula_id: matricula.id },
      _sum: { percentual: true }
    });

    const totalPercentualAssistido = somaDosPercentuais._sum.percentual || 0;

    const progressoGeralCalculado = totalAulas > 0 ? (totalPercentualAssistido / totalAulas) : 0;

    const progressoGeralClamp = Math.min(Math.max(progressoGeralCalculado, 0), 100);

    const statusAtualizado = progressoGeralClamp >= 100 ? 'CONCLUIDO' : 'EM_ANDAMENTO';

    return this.prisma.matricula.update({
      where: { id: matricula.id },
      data: {
        progresso: parseFloat(progressoGeralClamp.toFixed(2)),
        status: statusAtualizado,
        concluido_em: statusAtualizado === 'CONCLUIDO' ? new Date() : null
      }
    });
  }

}
