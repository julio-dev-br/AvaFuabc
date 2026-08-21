import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MateriaisService {
  constructor(private prisma: PrismaService) {}

  // 📂 Busca todas as apostilas/links atrelados a uma aula específica
  async obterPorAula(aulaId: number) {
    return this.prisma.material.findMany({
      where: { aula_id: aulaId },
      orderBy: { id: 'desc' },
    });
  }

  // 📂 Cria o registro na tabela Material
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

  // 📂 Remove fisicamente o registro do banco de dados
  async remover(id: number) {
    const existe = await this.prisma.material.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException('Material de apoio não localizado no banco.');
    }
    return this.prisma.material.delete({ where: { id } });
  }
}
