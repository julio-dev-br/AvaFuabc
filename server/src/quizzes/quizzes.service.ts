import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) { }

  // 1. Busca o Quiz com perguntas e alternativas (ocultando o campo 'correta')
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

  // 2. Recebe as respostas, calcula a nota, controla as tentativas e persiste na matrícula
  async responderQuiz(userId: number, quizId: number, dto: any) {
    // Busca o quiz com o gabarito oficial e traz o vínculo completo da aula
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        aula: {
          include: { modulo: true }
        },
        perguntas: {
          include: { alternativas: true },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz não encontrado.');
    }

    const totalPerguntas = quiz.perguntas.length;
    if (totalPerguntas === 0) {
      throw new BadRequestException('Este quiz não possui perguntas cadastradas.');
    }

    // 🌟 1. CIRCUITO DE CAÇA DO TREINAMENTO ID
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

    // 🌟 2. GARANTE A EXISTÊNCIA DA MATRÍCULA NO TOPO (Garante ID físico para o histórico)
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

    // 🌟 3. CÁLCULO REATIVO DO NÚMERO DA TENTATIVA ATUAL
    // Agrupa e conta quantas respostas esse aluno já deu no primeiro ID de pergunta do quiz
    const idPrimeiraPergunta = quiz.perguntas[0].id;
    const historicoRespostasAnteriores = await this.prisma.quizResponse.count({
      where: {
        matricula_id: matriculaAtiva.id,
        pergunta_id: idPrimeiraPergunta
      }
    });

    const tentativaAtual = historicoRespostasAnteriores + 1;
    const limiteTentativasAllowed = quiz.tentativas || 3;

    // Bloqueia o circuito caso o aluno tente burlar e estourar o limite fixado pelo RH
    if (tentativaAtual > limiteTentativasAllowed) {
      throw new BadRequestException(`Você já esgotou o limite de ${limiteTentativasAllowed} tentativas configuradas para esta avaliação.`);
    }

    let totalAcertos = 0;
    const respostasDetalhadas: any[] = [];

    // 🌟 4. LAÇO DE GRAVAÇÃO COM OS NOVOS CAMPOS OBRIGATÓRIOS DO POSTGRES
    for (const enviado of dto.respostas) {
      const pergunta = quiz.perguntas.find((p) => p.id === enviado.perguntaId);
      if (!pergunta) continue;

      const alternativa = pergunta.alternativas.find((a) => a.id === enviado.alternativaId);
      const ehCorreta = !!alternativa?.correta;
      if (ehCorreta) {
        totalAcertos++;
      }

      // Registra a resposta injetando a matricula_id e a tentativa_nro física
      await this.prisma.quizResponse.create({
        data: {
          matricula_id: Number(matriculaAtiva.id), // Chave vacinada
          usuario_id: Number(userId),
          pergunta_id: Number(enviado.perguntaId),
          alternativa_id: Number(enviado.alternativaId),
          tentativa_nro: Number(tentativaAtual)  // Histórico de auditoria do RH
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

    // Calcula a nota final formatada
    const notaFinalRaw = (totalAcertos / totalPerguntas) * 10;
    const notaFinal = parseFloat(notaFinalRaw.toFixed(2));

    let mediaExigida = quiz.nota_minima || 7.0;
    if (mediaExigida > 10) {
      mediaExigida = mediaExigida / 10;
    }

    const mMinima = mediaExigida;
    const aprovado = notaFinal >= mediaExigida;

    // 🌟 5. ATUALIZAÇÃO DO STATUS FINAL DA MATRÍCULA
    // Mantém a maior nota caso o aluno faça mais de uma tentativa autorizada
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
      notaMinimaExigida: mMinima,
      aprovado,
      tentativaRealizada: tentativaAtual,
      tentativasRestantes: Math.max(0, limiteTentativasAllowed - tentativaAtual),
      mensagem: aprovado
        ? 'Parabéns! Você atingiu a nota mínima.'
        : `Você não atingiu a nota mínima. Tentadeira ${tentativaAtual}/${limiteTentativasAllowed}. Revise o conteúdo e tente novamente.`,
      respostas: respostasDetalhadas
    };
  }

  // 3. Método Auxiliar: Criação Completa via Admin
  async criarQuizCompleto(data: {
    aulaId: number;
    titulo: string;
    notaMinima: number;
    perguntas: {
      pergunta: string;
      alternativas: { descricao: string; isCorreta: boolean }[];
    }[];
  }) {
    try {
      return await this.prisma.quiz.create({
        data: {
          aula_id: parseInt(data.aulaId.toString(), 10),
          titulo: data.titulo,
          nota_minima: parseInt(data.notaMinima.toString(), 10),
          perguntas: {
            create: data.perguntas.map((p) => ({
              pergunta: p.pergunta,
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
          perguntas: {
            include: { alternativas: true },
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // 🌟 NOVO: Método dedicado a persistir o Quiz gerado pela Inteligência Artificial
  async salvarQuizGeradoPorIA(data: {
    aulaId: number;
    titulo: string;
    notaMinima?: number;
    tentativas?: number;
    perguntas: any[];
  }) {
    try {
      console.log(`🧩 Processando inserção do Quiz de IA para a Aula ID [${data.aulaId}]...`);

      return await this.prisma.quiz.create({
        data: {
          aula_id: Number(data.aulaId),
          titulo: data.titulo || 'Avaliação de Conformidade Regulamentar',
          nota_minima: data.notaMinima ? Number(data.notaMinima) : 7.0,
          tentativas: data.tentativas ? Number(data.tentativas) : 3,
          perguntas: {
            create: data.perguntas.map((p) => ({
              pergunta: p.enunciado,
              ordem: p.ordem || undefined,
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
          perguntas: {
            include: { alternativas: true },
          },
        },
      });
    } catch (error: any) {
      console.error('🚨 ERRO AO PERSISTIR O QUIZ DA IA NO PRISMA:', error);
      throw new BadRequestException('Falha interna ao persistir o banco relacional de perguntas.');
    }
  }
}
