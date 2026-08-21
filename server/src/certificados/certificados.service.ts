import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit'); //  Adicione esta linha
import { Response } from 'express';

@Injectable()
export class CertificadosService {
  constructor(private prisma: PrismaService) {}

  // 1. Verifica se o usuário tem direito ao certificado e o cria no banco se elegível
  async verificarEGerarCertificado(userId: number, treinamentoId: number) {
    // Busca a matrícula do usuário
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

    // Se passou nas regras, verifica se o certificado já existe para não duplicar
    let certificado = await this.prisma.certificado.findFirst({
      where: { matricula_id: matricula.id }
    });

    if (!certificado) {
      const codigoAutenticidade = `FUABC-${matricula.id}-${Date.now().toString().slice(-6)}`;
      
      certificado = await this.prisma.certificado.create({
        data: {
          matricula_id: matricula.id,
          codigo: codigoAutenticidade,
          emitido_em: new Date(),
          qr_code: `https://fuabc.org.br{codigoAutenticidade}`,
        }
      });
    }

    return { certificado, matricula };
  }

  // 2. Desenha o PDF e faz o stream direto para a resposta HTTP do navegador
  async gerarPdfCertificado(userId: number, treinamentoId: number, res: Response) {
    const { certificado, matricula } = await this.verificarEGerarCertificado(userId, treinamentoId);

    // Cria o documento PDF em formato Paisagem (A4 deitado)
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

    // Configura os headers HTTP para o navegador entender que é um download de PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado-${certificado.codigo}.pdf`);

    // Direciona o fluxo do PDF para a resposta HTTP
    doc.pipe(res);

    // --- DESENHO DO CERTIFICADO (Layout) ---
    
    // Borda elegante
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
       .lineWidth(4)
       .stroke('#003366'); // Azul Corporativo

    // Título Principal
    doc.moveDown(4);
    doc.fillColor('#003366')
       .fontSize(36)
       .text('CERTIFICADO DE CONCLUSÃO', { align: 'center', stroke: true });

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
       .text(`concluiu com sucesso o treinamento de `, { align: 'center' });

    doc.moveDown(0.5);

    // Título do Treinamento
    doc.fillColor('#003366')
       .fontSize(20)
       .text(`"${matricula.treinamento?.titulo}"`, { align: 'center', stroke: true });

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
    
    doc.text(`Validável em: ${certificado.qr_code}`, { align: 'center' });

    // Finaliza o documento
    doc.end();
  }
}
