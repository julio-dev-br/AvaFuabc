import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) { }

  async obterQuizPorAula(aulaId: number) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { aula_id: aulaId },
      include: {
        perguntas: {
          orderBy: { ordem: 'asc' },
          include: {
            alternativas: {
              select: {
                id: true,
                descricao: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Nenhum quiz localizado para esta aula.');
    }

    return quiz;
  }

  async responderQuiz(userId: number, quizId: number, dto: any) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        aula: { include: { modulo: true } },
        perguntas: { include: { alternativas: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz não encontrado.');
    }

    const totalPerguntas = quiz.perguntas.length;
    if (totalPerguntas === 0) {
      throw new BadRequestException('Este quiz não possui perguntas cadastradas.');
    }

    let treinamentoId: number | null = null;
    if (quiz.aula?.modulo?.treinamento_id) {
      treinamentoId = Number(quiz.aula.modulo.treinamento_id);
    }

    const aulaIdFiltro = dto.aulaId ? Number(dto.aulaId) : quiz.aula_id;
    if (!treinamentoId && aulaIdFiltro) {
      const dadosAula = await this.prisma.aula.findUnique({
        where: { id: aulaIdFiltro },
        include: { modulo: { select: { treinamento_id: true } } }
      });
      if (dadosAula?.modulo?.treinamento_id) {
        treinamentoId = Number(dadosAula.modulo.treinamento_id);
      }
    }

    if (!treinamentoId) {
      throw new BadRequestException('Não foi possível determinar o treinamento vinculado a este quiz.');
    }

    let matriculaAtiva = await this.prisma.matricula.findFirst({
      where: {
        usuario_id: Number(userId),
        treinamento_id: Number(treinamentoId)
      }
    });

    if (!matriculaAtiva) {
      matriculaAtiva = await this.prisma.matricula.create({
        data: {
          usuario_id: Number(userId),
          treinamento_id: Number(treinamentoId),
          status: 'EM_ANDAMENTO',
          progresso: 0
        }
      });
    }

    const idPrimeiraPergunta = quiz.perguntas[0].id;
    const historicoRespostasAnteriores = await this.prisma.quizResponse.count({
      where: {
        matricula_id: matriculaAtiva.id,
        pergunta_id: idPrimeiraPergunta
      }
    });

    const tentativaAtual = historicoRespostasAnteriores + 1;
    const limiteTentativasAllowed = quiz.tentativas || 3;

    if (tentativaAtual > limiteTentativasAllowed) {
      throw new BadRequestException(`Você já esgotou o limite de ${limiteTentativasAllowed} tentativas configuradas para esta avaliação.`);
    }

    let totalAcertos = 0;
    const respostasDetalhadas: any[] = [];

    for (const enviado of dto.respostas) {
      const pergunta = quiz.perguntas.find((p) => p.id === enviado.perguntaId);
      if (!pergunta) continue;

      const alternativa = pergunta.alternativas.find((a) => a.id === enviado.alternativaId);
      const ehCorreta = !!alternativa?.correta;
      if (ehCorreta) {
        totalAcertos++;
      }

      await this.prisma.quizResponse.create({
        data: {
          matricula_id: Number(matriculaAtiva.id), 
          usuario_id: Number(userId),
          pergunta_id: Number(enviado.perguntaId),
          alternativa_id: Number(enviado.alternativaId),
          tentativa_nro: Number(tentativaAtual)  
        },
      });

      const alternativaCorreta = pergunta.alternativas.find((a) => a.correta);
      respostasDetalhadas.push({
        perguntaId: enviado.perguntaId,
        alternativaId: enviado.alternativaId,
        correta: ehCorreta,
        gabaritoId: alternativaCorreta ? alternativaCorreta.id : null,
      });
    }

    const notaFinalRaw = (totalAcertos / totalPerguntas) * 10;
    const notaFinal = parseFloat(notaFinalRaw.toFixed(2));

    let mediaExigida = quiz.nota_minima || 7.0;
    if (mediaExigida > 10) {
      mediaExigida = mediaExigida / 10;
    }

    const aprovado = notaFinal >= mediaExigida;
    const notaAnterior = matriculaAtiva.nota ? Number(matriculaAtiva.nota) : 0;
    const maiorNotaCalculada = Math.max(notaAnterior, notaFinal);

    await this.prisma.matricula.update({
      where: { id: Number(matriculaAtiva.id) },
      data: {
        nota: Number(maiorNotaCalculada),
        progresso: aprovado || matriculaAtiva.status === 'CONCLUIDO' ? 100 : Number(matriculaAtiva.progresso || 0),
        status: aprovado || matriculaAtiva.status === 'CONCLUIDO' ? 'CONCLUIDO' : 'REPROVADO',
        concluido_em: aprovado && !matriculaAtiva.concluido_em ? new Date() : matriculaAtiva.concluido_em
      }
    });

    return {
      totalPerguntas,
      totalAcertos,
      notaFinal,
      notaMinimaExigida: mediaExigida,
      aprovado,
      tentativaRealizada: tentativaAtual,
      tentativasRestantes: Math.max(0, limiteTentativasAllowed - tentativaAtual),
      mensagem: aprovado
        ? 'Parabéns! Você atingiu a nota mínima corporativa.'
        : `Você não atingiu a nota mínima. Tentativa ${tentativaAtual}/${limiteTentativasAllowed}. Revise e tente de novo.`,
      respostas: respostasDetalhadas
    };
  }

  async obterQuizParaEdicao(aulaId: number) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { aula_id: Number(aulaId) },
      orderBy: { id: 'desc' },
      include: {
        perguntas: {
          orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
          include: {
            alternativas: {
              orderBy: { id: 'asc' },
              select: {
                id: true,
                descricao: true,
                correta: true,
              },
            },
          },
        },
      },
    });

    return quiz || null;
  }

  async criarQuizCompleto(data: {
    aulaId: number;
    titulo: string;
    notaMinima: number;
    perguntas: {
      pergunta: string;
      alternativas: { descricao: string; isCorreta: boolean }[];
    }[];
  }) {
    const aulaIdNum = Number(data.aulaId);

    return this.prisma.$transaction(async (tx) => {
      await tx.quiz.deleteMany({ where: { aula_id: aulaIdNum } });

      return tx.quiz.create({
        data: {
          aula_id: aulaIdNum,
          titulo: data.titulo,
          nota_minima: Number(data.notaMinima),
          perguntas: {
            create: data.perguntas.map((p, idx) => ({
              pergunta: p.pergunta,
              ordem: idx + 1,
              alternativas: {
                create: p.alternativas.map((a) => ({
                  descricao: a.descricao,
                  correta: Boolean(a.isCorreta),
                })),
              },
            })),
          },
        },
        include: {
          perguntas: { include: { alternativas: true } },
        },
      });
    });
  }

  async salvarQuizGeradoPorIA(data: {
    aulaId: number;
    titulo: string;
    notaMinima?: number;
    tentativas?: number;
    perguntas: any[];
  }) {
    const aulaIdNum = Number(data.aulaId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.quiz.deleteMany({ where: { aula_id: aulaIdNum } });

        return tx.quiz.create({
          data: {
            aula_id: aulaIdNum,
            titulo: data.titulo || 'Avaliação de Conformidade Regulamentar',
            nota_minima: data.notaMinima ? Number(data.notaMinima) : 7.0,
            tentativas: data.tentativas ? Number(data.tentativas) : 3,
            perguntas: {
              create: data.perguntas.map((p, idx) => ({
                pergunta: p.enunciado,
                ordem: p.ordem || idx + 1,
                alternativas: {
                  create: [
                    { descricao: p.alternativaA, correta: p.respostaCorreta === 'A' },
                    { descricao: p.alternativaB, correta: p.respostaCorreta === 'B' },
                    { descricao: p.alternativaC, correta: p.respostaCorreta === 'C' },
                    { descricao: p.alternativaD, correta: p.respostaCorreta === 'D' },
                  ],
                },
              })),
            },
          },
          include: {
            perguntas: { include: { alternativas: true } },
          },
        });
      });
    } catch (error: any) {
      throw new BadRequestException('Falha interna ao persistir o banco relacional de perguntas.');
    }
  }
}
