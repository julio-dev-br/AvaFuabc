import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ResponderQuizDTO } from './dtos/responder-quiz.dto';

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
                descricao: true, // Traz apenas ID e texto, omitindo 'correta'
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

  // 2. Recebe as respostas, calcula a nota, salva no histórico E PERSISTE NA MATRÍCULA DO POSTGRES
  async responderQuiz(userId: number, quizId: number, dto: any) {
    // Busca o quiz com o gabarito oficial (incluindo o campo 'correta') e traz o vínculo completo da aula
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        aula: {
          include: {
            modulo: true
          }
        },
        perguntas: {
          include: {
            alternativas: true,
          },
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

    let totalAcertos = 0;
    const respostasDetalhadas: any[] = [];

    // Salva cada resposta individualmente no banco de dados (Histórico)
    for (const enviado of dto.respostas) {
      const pergunta = quiz.perguntas.find((p) => p.id === enviado.perguntaId);

      if (!pergunta) continue;

      const alternativa = pergunta.alternativas.find((a) => a.id === enviado.alternativaId);

      const ehCorreta = !!alternativa?.correta;
      if (ehCorreta) {
        totalAcertos++;
      }

      // Registra a resposta na tabela QuizResponse (respostas_quiz)
      await this.prisma.quizResponse.create({
        data: {
          usuario_id: userId,
          pergunta_id: enviado.perguntaId,
          alternativa_id: enviado.alternativaId,
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

    // 🌟 A VACINA DE ESCALA: Ajusta se a nota_minima do banco for maior que 10 (ex: 70) [14:18:02]
    let mediaExigida = quiz.nota_minima || 7.0;
    if (mediaExigida > 10) {
      mediaExigida = mediaExigida / 10;
    }

    const mMinima = mediaExigida; // Variável limpa para o retorno final
    const aprovado = notaFinal >= mediaExigida;

    // 🌟 CIRCUITO DE SEGURANÇA TRIPLO: Descobre o Treinamento ID por qualquer rastro disponível!
    let treinamentoId: number | null = null;

    // Tentativa 1: Olha a árvore relacional que o findUnique já carregou do Quiz
    if (quiz.aula?.modulo?.treinamento_id) {
      treinamentoId = Number(quiz.aula.modulo.treinamento_id);
    }

    // Tentativa 2: Se falhou, busca na marra usando o aulaId enviado pelo front
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

    if (treinamentoId) {
      // Localiza a linha de matrícula ativa do Julio para este treinamento específico
      const matriculaAtiva = await this.prisma.matricula.findFirst({
        where: {
          usuario_id: Number(userId),
          treinamento_id: Number(treinamentoId)
        }
      });

      if (matriculaAtiva) {
        // 🌟 FORÇA A GRAVAÇÃO: Injeta tipos numéricos limpos e explícitos no PostgreSQL [14:18:02]
        await this.prisma.matricula.update({
          where: { id: Number(matriculaAtiva.id) },
          data: {
            nota: Number(notaFinal),
            progresso: aprovado ? 100 : (matriculaAtiva.progresso ? Number(matriculaAtiva.progresso) : 0),
            status: aprovado ? 'CONCLUIDO' : 'REPROVADO',
            concluido_em: aprovado ? new Date() : null
          }
        });
      } else {

        // BÔNUS DE SEGURANÇA: Se o aluno chegou na prova sem matrícula por erro de rota, cria ela na hora com a nota! [14:18:02]
        await this.prisma.matricula.create({
          data: {
            usuario_id: Number(userId),
            treinamento_id: Number(treinamentoId),
            nota: Number(notaFinal),
            progresso: aprovado ? 100 : 0,
            status: aprovado ? 'CONCLUIDO' : 'REPROVADO',
            iniciado_em: new Date(),
            concluido_em: aprovado ? new Date() : null
          }
        });
      }
    } else { }

    return {
      totalPerguntas,
      totalAcertos,
      notaFinal,
      notaMinimaExigida: mMinima,
      aprovado,
      mensagem: aprovado
        ? 'Parabéns! Você atingiu a nota mínima.'
        : 'Você não atingiu a nota mínima. Revise o conteúdo e tente novamente.',
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
}
