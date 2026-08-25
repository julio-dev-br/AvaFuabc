import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TreinamentoService {
  constructor(private prisma: PrismaService) { }

  // 1. Busca treinamentos disponíveis baseados nas regras de negócio de RH
  async findAvailableForUser(user: any) {
    const filtrosPublico: any[] = [];

    if (user.empresa_id) {
      filtrosPublico.push({ tipo: 'EMPRESA', referencia_id: BigInt(user.empresa_id) });
    }
    if (user.unidade_id) {
      filtrosPublico.push({ tipo: 'UNIDADE', referencia_id: BigInt(user.unidade_id) });
    }
    if (user.departamento_id) {
      filtrosPublico.push({ tipo: 'DEPARTAMENTO', referencia_id: BigInt(user.departamento_id) });
    }
    if (user.cargo_id) {
      filtrosPublico.push({ tipo: 'CARGO', referencia_id: BigInt(user.cargo_id) });
    }
    if (user.usuario_externo_id) {
      filtrosPublico.push({ tipo: 'USUARIO', referencia_id: BigInt(user.usuario_externo_id) });
    }

    return this.prisma.treinamento.findMany({
      where: {
        ativo: true,
        OR: [
          {
            publicos: {
              none: {}
            }
          },
          {
            publicos: {
              some: {
                OR: filtrosPublico
              }
            }
          }
        ]
      },
      include: {
        modulos: {
          orderBy: { ordem: 'asc' },
          include: {
            aulas: {
              orderBy: { ordem: 'asc' },
              include: {
                materiais: true
              }
            }
          }
        },
        matriculas: {
          where: { usuario_id: user.id }
        }
      },
    });
  }

  // 2. Grava um novo Treinamento Base no banco
  async criar(data: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }) {
    return this.prisma.treinamento.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        carga_horaria: Number(data.carga_horaria),
        obrigatorio: data.obrigatorio,
        ativo: true,
        certificado: true
      }
    });
  }

  // 3. Grava um Módulo associado ao Treinamento
  async criarModulo(data: { treinamentoId: number; titulo: string; ordem: number }) {
    return this.prisma.modulo.create({
      data: {
        treinamento_id: Number(data.treinamentoId),
        titulo: data.titulo,
        ordem: Number(data.ordem)
      }
    });
  }

  // 4. Grava uma Aula vinculada a um Módulo programático
  async criarAula(data: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }) {
    const urlCrua = data.videoUrl ? data.videoUrl.trim() : '';

    // A MARRETA DO POSTGRESQL: Pega os últimos 11 caracteres do link de forma obrigatória!
    const idVideoPuro = urlCrua.slice(-11);

    // Injetado o 'www.', a barra '/' e o 'embed/' obrigatório para o player rodar!
    const urlFinal = 'https://www.youtube.com/embed/' + idVideoPuro.trim();

    // Persiste fisicamente no contêiner do PostgreSQL
    return this.prisma.aula.create({
      data: {
        modulo_id: Number(data.moduloId),
        titulo: data.titulo,
        descricao: data.descricao || null,
        video_url: urlFinal,
        ordem: Number(data.ordem)
      }
    });
  }

  // 5. Vincula o Treinamento a um público do RH (Essencial para o curso aparecer para os alunos)
  async vincularPublico(data: {
    treinamentoId: number;
    tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO';
    referenciaId: number
  }) {
    return this.prisma.treinamentoPublico.create({
      data: {
        treinamento_id: Number(data.treinamentoId),
        tipo: data.tipo,
        referencia_id: Number(data.referenciaId)
      }
    });
  }

  // 6 BI: Agrega contagens e dados estatísticos
  async obterMetricasPainel() {
    // 1. Contagens rápidas de volume para os cards de resumo
    const totalTreinamentos = await this.prisma.treinamento.count({ where: { ativo: true } });
    const totalUsuarios = await this.prisma.user.count();

    // 2. Agrupamento para o Gráfico de Pizza (Status de Conformidade das Matrículas)
    const matriculasConcluidas = await this.prisma.matricula.count({ where: { progresso: 100 } });
    const matriculasEmAndamento = await this.prisma.matricula.count({ where: { progresso: { lt: 100 } } });

    // 3. Consulta estruturada para o Gráfico de Barras (Ranking dos Cursos Mais Acessados)
    const rankingsCursos = await this.prisma.treinamento.findMany({
      where: { ativo: true },
      select: {
        titulo: true,
        _count: {
          select: { matriculas: true }
        }
      },
      orderBy: {
        matriculas: { _count: 'desc' }
      },
      take: 5
    });

    const labelsRanking = rankingsCursos.map(c => c.titulo);
    const dadosRanking = rankingsCursos.map(c => c._count.matriculas);

    return {
      cards: {
        totalTreinamentos,
        totalUsuarios,
        taxaConformidadeGeral: totalTreinamentos > 0 ? Math.round((matriculasConcluidas / (matriculasConcluidas + matriculasEmAndamento || 1)) * 100) : 0
      },
      graficoPizza: {
        dados: [matriculasConcluidas, matriculasEmAndamento],
        labels: ['Concluídos', 'Em Andamento']
      },
      graficoBarras: {
        labels: labelsRanking,
        dados: dadosRanking
      }
    };
  }

  // 7 GAMIFICAÇÃO: Calcula o Ranking de Alunos e Medalhas via PostgreSQL
  async obterDadosGamificacao(usuarioId: number) {
    const rankingGeral = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true
      },
      take: 5
    });

    const rankingFormatado = await Promise.all(
      rankingGeral.map(async (u) => {
        const contagemRespostas = await this.prisma.quizResponse.count({
          where: { usuario_id: u.id }
        });

        return {
          nome: u.name || 'Usuário Sem Nome',
          pontuacao: contagemRespostas * 10,
          isMe: u.id === usuarioId
        };
      })
    );

    rankingFormatado.sort((a, b) => b.pontuacao - a.pontuacao);

    const totalSuasRespostas = await this.prisma.quizResponse.count({
      where: { usuario_id: usuarioId }
    });

    const suasMatriculas = await this.prisma.matricula.findMany({
      where: { usuario_id: usuarioId }
    });

    const medalhas = [
      {
        id: 'ouro',
        titulo: 'Gênio da Conformidade',
        desc: 'Participou e respondeu avaliações com sucesso',
        icone: 'workspace_premium',
        cor: '#ffd700',
        conquistada: totalSuasRespostas >= 5
      },
      {
        id: 'prata',
        titulo: 'Aprovado de Primeira',
        desc: 'Respondeu ao seu primeiro quiz no AVA Fuabc',
        icone: 'military_tech',
        cor: '#c0c0c0',
        conquistada: totalSuasRespostas > 0
      },
      {
        id: 'bronze',
        titulo: 'Primeiro Passo',
        desc: 'Concluiu o primeiro curso na plataforma',
        icone: 'emoji_events',
        cor: '#cd7f32',
        conquistada: suasMatriculas.some(m => m.progresso === 100)
      }
    ];

    return {
      ranking: rankingFormatado,
      medalhas: medalhas
    };
  }

  // Traz o catálogo completo com a contagem de módulos para o Painel do Gestor
  async listarTreinamentosGerencial() {
    const treinamentos = await this.prisma.treinamento.findMany({
      orderBy: { id: 'desc' },
      include: {
        modulos: {
          select: { id: true }
        }
      }
    });

    // Formata o retorno para incluir a propriedade computada totalModulos que o HTML do Admin lê
    return treinamentos.map(t => ({
      ...t,
      totalModulos: t.modulos.length
    }));
  }

  // Busca o curso isolado por ID trazendo os módulos, aulas e a tabela Material
  async obterConteudoCurso(id: number) {
    return this.prisma.treinamento.findUnique({
      where: { id: id },
      include: {
        modulos: {
          orderBy: { ordem: 'asc' },
          include: {
            aulas: {
              orderBy: { ordem: 'asc' },
              include: {
                // 🌟 A fiação relacional que precisávamos para os PDFs pularem na tela do Aluno!
                materiais: true
              }
            }
          }
        }
      }
    });
  }

  // 💼 PAINEL DO ADMIN: Lista todos os treinamentos/projetos com dados de auditoria estruturados
  async listarProjetosAdmin() {
    const projetos = await this.prisma.treinamento.findMany({
      select: {
        id: true,
        titulo: true,
        descricao: true,
        carga_horaria: true,
        obrigatorio: true,
        ativo: true,
        createdAt: true,
        // 📊 Agrega a contagem de módulos criados no projeto para exibir no card do Kanban
        _count: {
          select: {
            modulos: true,
            publicos: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Trata o retorno para enviar chaves limpas e fáceis de ler no Angular
    return projetos.map(p => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao,
      cargaHoraria: p.carga_horaria,
      obrigatorio: p.obrigatorio,
      ativo: p.ativo,
      dataCriacao: p.createdAt,
      totalModulos: p._count.modulos,
      totalRegrasPublico: p._count.publicos
    }));
  }


}
