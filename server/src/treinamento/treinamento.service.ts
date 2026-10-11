import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TreinamentoService {
  constructor(private prisma: PrismaService) { }

  // Busca treinamentos disponíveis baseados nas regras de negócio de RH (Apenas ATIVOS)
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
        ativo: true, // 🛡️ FILTRO ABSOLUTO: Aluno NUNCA enxerga rascunhos!
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

  // 🛡️ CORRIGIDO: O curso agora nasce como RASCUNHO (ativo: false) de forma segura
  async criar(data: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }) {
    return this.prisma.treinamento.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        carga_horaria: Number(data.carga_horaria),
        obrigatorio: data.obrigatorio,
        ativo: false, // 🚀 NASCE COMO RASCUNHO OCULTO!
        certificado: true
      }
    });
  }

  async criarModulo(data: { treinamentoId: number; titulo: string; ordem: number }) {
    return this.prisma.modulo.create({
      data: {
        treinamento_id: Number(data.treinamentoId),
        titulo: data.titulo,
        ordem: Number(data.ordem)
      }
    });
  }

  async criarAula(data: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }) {
    const urlCrua = data.videoUrl ? String(data.videoUrl).trim() : '';
    const regexYoutube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/)([a-zA-Z0-9_-]{11})/;
    const resultadoMatch = urlCrua.match(regexYoutube);

    const idVideoPuro = resultadoMatch
      ? resultadoMatch[1]
      : urlCrua.replace(/[^a-zA-Z0-9_-]/g, '').slice(-11);

    // const urlFinal = `https://youtube.com{idVideoPuro.trim()}?enablejsapi=1`;
    const urlFinal = `https://youtube.com/embed/${idVideoPuro.trim()}?enablejsapi=1`;

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


  async vincularPublico(data: {
    treinamentoId: number;
    tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO';
    referenciaId: number
  }) {
    const novaRegra = await this.prisma.treinamentoPublico.create({
      data: {
        treinamento_id: Number(data.treinamentoId),
        tipo: data.tipo,
        referencia_id: Number(data.referenciaId)
      }
    });

    // Busca se o treinamento já está publicado no momento do vínculo
    const treinamento = await this.prisma.treinamento.findUnique({
      where: { id: Number(data.treinamentoId) },
      select: { ativo: true }
    });

    // 🚀 COMPLIANCE: Se o curso ainda for um rascunho, NÃO gera matrículas no loop! 
    // Elas serão geradas automaticamente em massa no método de publicação.
    if (treinamento && treinamento.ativo) {
      const queryFiltroUser: any = { ativo: true };
      const refIdBigInt = BigInt(data.referenciaId);

      if (data.tipo === 'EMPRESA') queryFiltroUser.empresa_id = refIdBigInt;
      if (data.tipo === 'UNIDADE') queryFiltroUser.unidade_id = refIdBigInt;
      if (data.tipo === 'DEPARTAMENTO') queryFiltroUser.departamento_id = refIdBigInt;
      if (data.tipo === 'CARGO') queryFiltroUser.cargo_id = refIdBigInt;
      if (data.tipo === 'USUARIO') queryFiltroUser.id = Number(data.referenciaId);

      const usuariosAfetados = await this.prisma.user.findMany({
        where: queryFiltroUser,
        select: { id: true }
      });

      for (const usuario of usuariosAfetados) {
        await this.prisma.matricula.upsert({
          where: {
            usuario_id_treinamento_id: {
              usuario_id: usuario.id,
              treinamento_id: Number(data.treinamentoId)
            }
          },
          update: {},
          create: {
            usuario_id: usuario.id,
            treinamento_id: Number(data.treinamentoId),
            status: 'EM_ANDAMENTO',
            progresso: 0
          }
        });
      }
    }

    return novaRegra;
  }

  async obterMetricasPainel() {
    const totalTreinamentos = await this.prisma.treinamento.count({ where: { ativo: true } });
    const totalUsuarios = await this.prisma.user.count();

    // 📊 SEPARAÇÃO REAL: Concluídos com sucesso vs Em Andamento vs Reprovados em avaliações
    const matriculasConcluidas = await this.prisma.matricula.count({ where: { status: 'CONCLUIDO' } });
    const matriculasEmAndamento = await this.prisma.matricula.count({ where: { status: 'EM_ANDAMENTO' } });
    const matriculasReprovadas = await this.prisma.matricula.count({ where: { status: 'REPROVADO' } });

    const rankingsCursos = await this.prisma.treinamento.findMany({
      where: { ativo: true },
      select: {
        titulo: true,
        _count: { select: { matriculas: true } }
      },
      orderBy: { matriculas: { _count: 'desc' } },
      take: 5
    });

    const totalMatriculasValidas = matriculasConcluidas + matriculasEmAndamento + matriculasReprovadas;

    return {
      cards: {
        totalTreinamentos,
        totalUsuarios,
        taxaConformidadeGeral: totalMatriculasValidas > 0 ? Math.round((matriculasConcluidas / totalMatriculasValidas) * 100) : 0
      },
      graficoPizza: {
        // Injeta a raia de reprovados para o painel de RH atuar
        dados: [matriculasConcluidas, matriculasEmAndamento, matriculasReprovadas],
        labels: ['Concluintes', 'Em Andamento', 'Reprovados']
      },
      graficoBarras: {
        labels: rankingsCursos.map(c => c.titulo),
        dados: rankingsCursos.map(c => c._count.matriculas)
      }
    };
  }

  async obterMetricasAnaliticas() {
    const totalTreinamentos = await this.prisma.treinamento.count({ where: { ativo: true } });
    const totalUsuarios = await this.prisma.user.count();

    const matriculasConcluidas = await this.prisma.matricula.count({ where: { status: 'CONCLUIDO' } });
    const matriculasEmAndamento = await this.prisma.matricula.count({ where: { status: 'EM_ANDAMENTO' } });
    const matriculasReprovadas = await this.prisma.matricula.count({ where: { status: 'REPROVADO' } });

    const rankingsCursos = await this.prisma.treinamento.findMany({
      where: { ativo: true },
      select: {
        titulo: true,
        _count: { select: { matriculas: true } }
      },
      orderBy: { matriculas: { _count: 'desc' } },
      take: 5
    });

    // 🚀 HISTÓRICO REAL INTEGRADO: Varre os 12 meses do calendário de forma dinâmica!
    const matriculasAnoCorrente = await this.prisma.matricula.findMany({
      select: { iniciado_em: true }
    });

    // 1. Inicializa o array cobrindo todos os meses do ano (0 a 11)
    const contagemPorMes = Array(12).fill(0);

    matriculasAnoCorrente.forEach(mat => {
      if (mat.iniciado_em) {
        const mes = new Date(mat.iniciado_em).getMonth(); // Jan = 0, Out = 9, Dez = 11
        if (mes >= 0 && mes <= 11) {
          contagemPorMes[mes]++;
        }
      }
    });

    // 2. Monta o histórico acumulado real de Janeiro até Dezembro de forma sequencial limpa
    // 2. Monta o histórico acumulado real cortando cirurgicamente no mês corrente do calendário
    const dadosHistoricoAcumulado = Array(12).fill(0);
    let acumuladorMatriculas = 0;

    // Captura dinamicamente o número do mês atual em que estamos (Jan = 0, Out = 9, Dez = 11)
    const mesAtualDoSistema = new Date().getMonth();

    for (let m = 0; m < 12; m++) {
      acumuladorMatriculas += contagemPorMes[m];

      // 🚀 A TRAVA GESTORA: Se o mês já passou ou é o mês atual, grava o acumulado.
      // Se for um mês futuro (Novembro ou Dezembro), o array NÃO preenche e a linha morre na hora!
      if (m <= mesAtualDoSistema) {
        dadosHistoricoAcumulado[m] = acumuladorMatriculas;
      } else {
        // Remove a posição para o Chart.js quebrar a linha e não projetar para o futuro
        dadosHistoricoAcumulado[m] = null;
      }
    }

    // 🚀 EXTERMINADO: Removido o segundo loop fantasma e o .slice que causavam o travamento no 1.0!

    const todasMatriculas = await this.prisma.matricula.findMany({
      include: { user: true }
    }) as any[];

    // 🚀 SINTONIZADO COM OS ID REAIS VINDOS DO SEED E DO MOCK PROTHEUS
    const hospitaisFuabc = [
      { id: 2000000000000001, nome: 'Hospital Mário Covas (PS)', concluidos: 0, total: 0 },
      { id: 2000000000000002, nome: 'CHM Santo André (UTI)', concluidos: 0, total: 0 },
      { id: 2000000000000099, nome: 'Fundação ABC - Ambulatório', concluidos: 0, total: 0 }
    ];

    todasMatriculas.forEach(mat => {
      const funcionario = mat.user;
      if (funcionario) {
        const unidadeId = funcionario.unidade_id;
        if (unidadeId) {
          const hospital = hospitaisFuabc.find(h => h.id === Number(unidadeId));
          if (hospital) {
            hospital.total++;
            if (mat.status === 'CONCLUIDO' && Number(mat.progresso) === 100) {
              hospital.concluidos++;
            }
          }
        }
      }
    });

    const valoresConformidade = hospitaisFuabc.map(h => h.total > 0 ? Math.round((h.concluidos / h.total) * 100) : 0);
    const totalMatriculasGerais = matriculasConcluidas + matriculasEmAndamento + matriculasReprovadas;
    const taxaConformidadeGeral = totalMatriculasGerais > 0 ? Math.round((matriculasConcluidas / totalMatriculasGerais) * 100) : 0;

    return {
      cards: { totalTreinamentos, totalUsuarios, taxaConformidadeGeral: `${taxaConformidadeGeral}%` },
      graficoPizza: {
        dados: [matriculasConcluidas, matriculasEmAndamento, matriculasReprovadas],
        labels: ['Concluídos', 'Em Andamento', 'Reprovados']
      },
      graficoBarras: { labels: rankingsCursos.map(c => c.titulo), dados: rankingsCursos.map(c => c._count.matriculas) },
      graficoLinhaMatriculas: dadosHistoricoAcumulado, // 🚀 Viaja o vetor limpo de 12 posições reais!
      graficoBarrasUnidades: {
        labels: hospitaisFuabc.map(h => h.nome),
        valores: valoresConformidade
      }
    };
  }


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
      { id: 'ouro', titulo: 'Gênio da Conformidade', desc: 'Participou e respondeu avaliações com sucesso', icone: 'workspace_premium', cor: '#ffd700', conquistada: totalSuasRespostas >= 5 },
      { id: 'prata', titulo: 'Aprovado de Primeira', desc: 'Respondeu ao seu primeiro quiz no AVA Fuabc', icone: 'military_tech', cor: '#c0c0c0', conquistada: totalSuasRespostas > 0 },
      { id: 'bronze', titulo: 'Primeiro Passo', desc: 'Concluiu o primeiro curso na plataforma', icone: 'emoji_events', cor: '#cd7f32', conquistada: suasMatriculas.some(m => m.progresso === 100) }
    ];

    return { ranking: rankingFormatado, medalhas };
  }

  async listarTreinamentosGerencial() {
    const treinamentos = await this.prisma.treinamento.findMany({
      orderBy: { id: 'desc' },
      include: { modulos: { select: { id: true } } }
    });
    return treinamentos.map(t => ({ ...t, totalModulos: t.modulos.length }));
  }

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

  async listarProjetosAdmin() {
    const projetos = await this.prisma.treinamento.findMany({
      include: {
        kanban_cards: { include: { coluna: true } },
        _count: { select: { modulos: true, publicos: true } }
      },
      orderBy: { id: 'desc' }
    });

    return projetos.map(p => {
      const temCard = p.kanban_cards && p.kanban_cards.length > 0;
      const cardPrimeiro = temCard ? p.kanban_cards[0] : null;

      return {
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao,
        cargaHoraria: p.carga_horaria,
        ativo: p.ativo,
        totalModulos: p._count.modulos,
        totalRegrasPublico: p._count.publicos,
        estagioId: cardPrimeiro ? Number(cardPrimeiro.coluna_id) : 1,
        estagioNome: cardPrimeiro && cardPrimeiro.coluna ? cardPrimeiro.coluna.titulo : '📌 Em Rascunho / Mapeamento',
        estagioCor: cardPrimeiro && cardPrimeiro.coluna ? cardPrimeiro.coluna.cor : '#dc2626'
      };
    });
  }

  async removerVinculoPublico(vinculoId: number) {
    const vinculoExistente = await this.prisma.treinamentoPublico.findUnique({
      where: { id: Number(vinculoId) },
    });
    if (!vinculoExistente) throw new NotFoundException('Esta regra de vínculo organizacional não foi localizada.');

    await this.prisma.treinamentoPublico.delete({ where: { id: Number(vinculoId) } });
    return { success: true, message: 'Vínculo removido com sucesso!' };
  }

  async finalizarEPublicarTreinamento(treinamentoId: number, usuarioId: number) {
    const curso = await this.prisma.treinamento.findUnique({
      where: { id: Number(treinamentoId) },
      include: { publicos: true } // Traz as regras salvas em rascunho
    });

    if (!curso) throw new NotFoundException('Treinamento não localizado para fechamento.');

    let colunaDestino = await this.prisma.kanbanColuna.findFirst({
      where: { ordem: 3 },
      orderBy: { id: 'asc' }
    });

    if (!colunaDestino) {
      colunaDestino = await this.prisma.kanbanColuna.findFirst({
        where: { titulo: { contains: 'Publicado', mode: 'insensitive' } },
        orderBy: { id: 'asc' }
      });
    }

    if (!colunaDestino) {
      colunaDestino = await this.prisma.kanbanColuna.create({
        data: { usuario_id: Number(usuarioId), titulo: '🚀 Cursos Publicados', ordem: 3, cor: '#10b981' }
      });
    }

    const maiorOrdemCard = await this.prisma.kanbanCard.aggregate({
      where: { coluna_id: colunaDestino.id },
      _max: { ordem: true }
    });
    const proximaOrdem = (maiorOrdemCard._max.ordem || 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      // 1. Ativa o curso abrindo os portões do catálogo para os alunos afetados
      const cursoAtualizado = await tx.treinamento.update({
        where: { id: Number(treinamentoId) },
        data: { ativo: true }
      });

      // 2. Insere o cartão de controle na coluna 3 (Publicados) do Kanban gerencial
      const novoCard = await tx.kanbanCard.create({
        data: {
          coluna_id: colunaDestino.id,
          treinamento_id: cursoAtualizado.id,
          titulo: cursoAtualizado.titulo,
          descricao: cursoAtualizado.descricao || 'Curso regulamentar publicado via Fábrica de Conteúdos.',
          ordem: proximaOrdem
        }
      });

      // 3. 💥 DISPARO RETROATIVO: Varre as regras salvas e gera as matrículas legítimas em lote na ativação!
      for (const regra of curso.publicos) {
        const queryFiltroUser: any = { ativo: true };
        const refIdBigInt = BigInt(regra.referencia_id);

        if (regra.tipo === 'EMPRESA') queryFiltroUser.empresa_id = refIdBigInt;
        if (regra.tipo === 'UNIDADE') queryFiltroUser.unidade_id = refIdBigInt;
        if (regra.tipo === 'DEPARTAMENTO') queryFiltroUser.departamento_id = refIdBigInt;
        if (regra.tipo === 'CARGO') queryFiltroUser.cargo_id = refIdBigInt;
        if (regra.tipo === 'USUARIO') queryFiltroUser.id = Number(regra.referencia_id);

        const usuariosAfetados = await tx.user.findMany({
          where: queryFiltroUser,
          select: { id: true }
        });

        for (const usuario of usuariosAfetados) {
          await tx.matricula.upsert({
            where: {
              usuario_id_treinamento_id: {
                usuario_id: usuario.id,
                treinamento_id: cursoAtualizado.id
              }
            },
            update: {},
            create: {
              usuario_id: usuario.id,
              treinamento_id: cursoAtualizado.id,
              status: 'EM_ANDAMENTO',
              progresso: 0
            }
          });
        }
      }

      console.log(`🏆 KANBAN INTEGRADO COM MATRÍCULAS LOTE: [${novoCard.titulo}] publicado e liberado!`);

      return {
        success: true,
        treinamentoId: cursoAtualizado.id,
        cardId: novoCard.id,
        message: 'Esteira concluída! Curso ativo, card inserido no Kanban e matrículas geradas em lote!'
      };
    });
  }
}
