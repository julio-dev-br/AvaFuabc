import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit');
import { Response } from 'express';

@Injectable()
export class CertificadosService {
  constructor(private prisma: PrismaService) { }


  async verificarEGerarCertificado(userId: number, treinamentoId: number) {
    const matricula = await this.prisma.matricula.findFirst({
      where: { usuario_id: userId, treinamento_id: treinamentoId },
      include: { user: true, treinamento: true }
    });

    if (!matricula) {
      throw new NotFoundException('Matrícula não localizada para este curso.');
    }

    // Regra 1: Precisa ter 100% de progresso nas aulas
    if ((matricula.progresso || 0) < 100) {
      throw new BadRequestException('Você precisa concluir 100% das aulas antes de emitir o certificado.');
    }

    // Regra 2: Precisa ter sido aprovado no Quiz (Se o curso tiver quiz)
    const quiz = await this.prisma.quiz.findFirst({
      where: { aula: { modulo: { treinamento_id: treinamentoId } } }
    });

    if (quiz) {
      const notaMinima = quiz.nota_minima || 7.0;
      if (!matricula.nota || matricula.nota < notaMinima) {
        throw new BadRequestException(`Você precisa atingir a nota mínima de ${notaMinima} no quiz.`);
      }
    }

    let certificado = await this.prisma.certificado.findFirst({
      where: { matricula_id: matricula.id }
    });

    if (!certificado) {
      const codigoAutenticidade = `FUABC-${matricula.id}-${Date.now().toString().slice(-6)}`;
      const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';

      certificado = await this.prisma.certificado.create({
        data: {
          matricula_id: matricula.id,
          codigo: codigoAutenticidade,
          emitido_em: new Date(),
          // 🚀 ALVO CERTÍSSIMO: Aponta para o novo túnel público do seu controller!
          qr_code: `${baseUrl}/certificados/publico/validar/${codigoAutenticidade}`,
        }
      });
    }

    return { certificado, matricula };
  }

  async gerarPdfCertificado(userId: number, treinamentoId: number, res: Response) {
    const { certificado, matricula } = await this.verificarEGerarCertificado(userId, treinamentoId);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado-${certificado.codigo}.pdf`);

    doc.pipe(res);

    // --- DESENHO DO CERTIFICADO (Layout) ---

    // Borda elegante (Trancada em 4 pixels para a moldura externa)
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(4)
      .stroke('#003366'); // Azul Corporativo

    // Título Principal
    doc.moveDown(4);
    doc.fillColor('#003366')
      .fontSize(36)
      .text('CERTIFICADO DE CONCLUSÃO', { align: 'center' });

    doc.moveDown(2);

    // Texto de atribuição
    doc.fillColor('#333333')
      .fontSize(16)
      .text('Certificamos para os devidos fins que o colaborador(a)', { align: 'center' });

    doc.moveDown(0.5);

    // Nome do Aluno
    doc.fillColor('#000000')
      .fontSize(24)
      .text(matricula.user?.name || 'Colaborador', { align: 'center', underline: true });

    doc.moveDown(0.5);

    // Detalhes do Curso
    doc.fillColor('#333333')
      .fontSize(16)
      .text(`concluiu com sucesso o treinamento de`, { align: 'center' });

    doc.moveDown(0.5);

    // Título do Treinamento (Cristalino e perfeitamente legível)
    doc.fillColor('#003366')
      .fontSize(20)
      .text(`"${matricula.treinamento?.titulo}"`, { align: 'center' });

    doc.moveDown(1);

    // Carga horária e Data
    const dataFormatada = new Date(certificado.emitido_em!).toLocaleDateString('pt-BR');
    doc.fillColor('#555555')
      .fontSize(14)
      .text(`Carga Horária: ${matricula.treinamento?.carga_horaria || 0} horas | Emitido em: ${dataFormatada}`, { align: 'center' });

    doc.moveDown(4);

    // Rodapé com o Código de Autenticação
    doc.fillColor('#777777')
      .fontSize(10)
      .text(`Código de Autenticidade: ${certificado.codigo}`, { align: 'center' });

    // Links de validação dinâmicos com o fuso correto
    doc.text(`Validável em: ${certificado.qr_code}`, { align: 'center' });

    // Finaliza o documento e despacha o stream
    doc.end();
  }
  
  async validarTokenCertificado(codigoToken: string) {
    const certificado = await this.prisma.certificado.findFirst({
      where: { codigo: codigoToken },
      include: {
        matricula: {
          include: {
            user: {
              select: { name: true, matricula: true } // Traz os dados do profissional protegendo dados sensíveis
            },
            treinamento: {
              select: { titulo: true, carga_horaria: true } // Traz o escopo do curso regulamentar
            }
          }
        }
      }
    });

    // 🚨 CASO DE FRAUDE: Se o token não existir ou foi forjado, barra o acesso na hora
    if (!certificado || !certificado.matricula) {
      throw new NotFoundException('Atenção: Este documento não consta nos registros oficiais da FUABC. Certificado Inválido!');
    }

    // 🚀 BLINDADO CONTRA NULL: Adicionado fallbacks (??) e encadeamento opcional (?.) em todas as propriedades!
    const nomeColaborador = certificado.matricula.user?.name ?? 'Colaborador não localizado';
    const regMatricula = certificado.matricula.user?.matricula ?? 'N/A';
    const tituloCurso = certificado.matricula.treinamento?.titulo ?? 'Treinamento não localizado';
    const cargaCurso = certificado.matricula.treinamento?.carga_horaria !== undefined && certificado.matricula.treinamento?.carga_horaria !== null
      ? `${certificado.matricula.treinamento.carga_horaria} horas`
      : '0 horas';

    // 🟢 CASO AUTÊNTICO: Retorna o carimbo digital completo de conformidade para a tela do auditor
    return {
      autentico: true,
      mensagem: 'Certificado de Conclusão devidamente Autenticado e Válido!',
      colaborador: nomeColaborador,
      refeferenciaMatricula: regMatricula,
      treinamento: tituloCurso,
      cargaHoraria: cargaCurso,
      emitidoEm: certificado.emitido_em
    };
  }
}
