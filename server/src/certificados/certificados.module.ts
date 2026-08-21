import { Module } from '@nestjs/common';
import { CertificadosService } from './certificados.service';
import { CertificadosController } from './certificados.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [CertificadosController],
  providers: [CertificadosService, PrismaService, JwtService],
})
export class CertificadosModule {}
