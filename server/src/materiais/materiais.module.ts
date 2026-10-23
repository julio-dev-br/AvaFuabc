import { Module } from '@nestjs/common';
import { MateriaisController } from './materiais.controller';
import { MateriaisService } from './materiais.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({

  imports: [], 
  controllers: [MateriaisController],

  providers: [MateriaisService, PrismaService], 
  exports: [MateriaisService] 
})
export class MateriaisModule {}
