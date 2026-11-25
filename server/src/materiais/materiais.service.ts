import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MateriaisService {
  constructor(private prisma: PrismaService) {}

  async obterPorAula(aulaId: number, usuarioId?: number) {
    const materiais = await this.prisma.material.findMany({
      where: { aula_id: aulaId },
      include: usuarioId
        ? {
            leituras: {
              where: { usuario_id: usuarioId },
              select: { id: true, lido_em: true },
            },
          }
        : undefined,
      orderBy: { id: 'desc' },
    });

    return materiais.map((mat: any) => {
      const registroLeitura = mat.leituras?.[0] || null;
      const { leituras, ...dadosMaterial } = mat;
      return {
        ...dadosMaterial,
        lido: !!registroLeitura,
        lido_em: registroLeitura?.lido_em || null,
      };
    });
  }

  async registrarLeitura(materialId: number, usuarioId: number) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material de apoio não localizado no banco.');
    }

    const leitura = await this.prisma.leituraMaterial.upsert({
      where: {
        usuario_id_material_id: {
          usuario_id: usuarioId,
          material_id: materialId,
        },
      },
      update: {
        lido_em: new Date(),
      },
      create: {
        usuario_id: usuarioId,
        material_id: materialId,
        lido_em: new Date(),
      },
    });

    return {
      material_id: materialId,
      lido: true,
      lido_em: leitura.lido_em,
    };
  }

  async adicionar(data: { aulaId: number; nome: string; url: string; tipo: string }) {
    return this.prisma.material.create({
      data: {
        aula_id: data.aulaId,
        nome: data.nome,
        url: data.url,
        tipo: data.tipo,
      },
    });
  }

  async remover(id: number) {
    const existe = await this.prisma.material.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException('Material de apoio não localizado no banco.');
    }
    return this.prisma.material.delete({ where: { id } });
  }
}
