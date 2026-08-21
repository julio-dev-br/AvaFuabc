import { Module } from '@nestjs/common';
import { MateriaisController } from './materiais.controller';
import { MateriaisService } from './materiais.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  // ✅ CORRIGIDO: O array de imports fica vazio porque o PrismaService é um Provedor e não um Módulo!
  imports: [], 
  controllers: [MateriaisController],
  // ✅ CORRIGIDO: O PrismaService entra aqui nos providers para abastecer as queries SQL do seu Service
  providers: [MateriaisService, PrismaService], 
  exports: [MateriaisService] 
})
export class MateriaisModule {}
