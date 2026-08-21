import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
 

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 🌟 ARQUITETURA NOVO PRISMA 7/8: Alimenta o motor forçando a leitura da URL do contêiner
    super({
      datasourceUrl: process.env.DATABASE_URL || "postgresql://admin_fuabc:SenhaForteSegura2026@localhost:5432/ava_fuabc_db?schema=public"
    } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
