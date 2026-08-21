import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  // 👤 1. ROTA DO ALUNO: Lista todos os alertas ativos e não lidos do colaborador
  async listarDoUsuario(usuarioId: number) {
    return this.prisma.notification.findMany({
      where: {
        usuario_id: Number(usuarioId),
        lida: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  // 👤 2. ROTA DO ALUNO: Marca um comunicado específico como lido (Zera o Badge do sininho)
  async marcarComoLida(notificacaoId: number) {
    const notificacao = await this.prisma.notification.findUnique({
      where: { id: Number(notificacaoId) },
    });

    if (!notificacao) {
      throw new NotFoundException('Notificação não localizada no banco de dados.');
    }

    return this.prisma.notification.update({
      where: { id: Number(notificacaoId) },
      data: { lida: true },
    });
  }

  // 💼 3. ROTA DO GESTOR: Localiza os funcionários pelos filtros do Protheus e cria as notificações em massa
  async dispararComunicadoEmMassa(dados: { escopo: string; referenciaId?: number; titulo: string; mensagem: string }) {
    const { escopo, referenciaId, titulo, mensagem } = dados;

    // Monta o filtro condicional para buscar apenas colaboradores ativos nas chaves organizacionais
    const filtroUsuario: any = { ativo: true };

    if (escopo === 'EMPRESA' && referenciaId) filtroUsuario.empresa_id = BigInt(referenciaId);
    if (escopo === 'UNIDADE' && referenciaId) filtroUsuario.unidade_id = BigInt(referenciaId);
    if (escopo === 'DEPARTAMENTO' && referenciaId) filtroUsuario.departamento_id = BigInt(referenciaId);

    // Busca em lote no PostgreSQL todos os IDs que batem com a lotação de RH selecionada
    const usuariosAlvo = await this.prisma.user.findMany({
      where: filtroUsuario,
      select: { id: true }
    });

    if (usuariosAlvo.length === 0) {
      return {
        sucesso: false,
        totalEnviados: 0,
        mensagem: 'Nenhum colaborador ativo foi localizado para o escopo organizacional selecionado.'
      };
    }

    // Estrutura o array de objetos para a inserção em alta performance (Bulk Insert)
    const cargaNotificacoes = usuariosAlvo.map(usuario => ({
      usuario_id: usuario.id,
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      lida: false
    }));

    // Executa a transação de bloco no Postgres criando todos os registros de uma só vez
    await this.prisma.notification.createMany({
      data: cargaNotificacoes
    });

    return {
      sucesso: true,
      totalEnviados: usuariosAlvo.length,
      mensagem: `Comunicado institucional disparado com sucesso para ${usuariosAlvo.length} colaboradores!`
    };
  }
}
