import { Module } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { MatriculaController } from './matricula.controller';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste a quantidade de ../ se necessário
import { JwtService } from '@nestjs/jwt'; // O AuthGuard precisa dele para validar o token nesta rota

@Module({
  controllers: [MatriculaController],
  providers: [
    MatriculaService, 
    PrismaService, // 🌟 Adicionado para resolver o erro do banco de dados
    JwtService     // 🌟 Adicionado para o AuthGuard conseguir validar seus tokens
  ],
})
export class MatriculaModule {}
