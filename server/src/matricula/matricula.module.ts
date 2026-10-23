import { Module } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { MatriculaController } from './matricula.controller';
import { PrismaService } from '../prisma/prisma.service'; 
import { JwtService } from '@nestjs/jwt'; 

@Module({
  controllers: [MatriculaController],
  providers: [
    MatriculaService, 
    PrismaService, 
    JwtService     
  ],
})
export class MatriculaModule {}
