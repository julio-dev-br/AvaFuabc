import { Module } from '@nestjs/common';
import { TreinamentoService } from './treinamento.service';
import { TreinamentoController } from './treinamento.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [TreinamentoController],
  providers: [TreinamentoService, PrismaService, JwtService], 
})
export class TreinamentoModule {}