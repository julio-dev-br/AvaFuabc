import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user/user.controller';
import { MatriculaModule } from './matricula/matricula.module';
import { TreinamentoModule } from './treinamento/treinamento.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CertificadosModule } from './certificados/certificados.module';
import { ForumModule } from './forum/forum.module';
import { KanbanModule } from './kanban/kanban.module';
import { NotificacoesService } from './motificacoes/motificacoes.service';
import { NotificacoesController } from './motificacoes/notificacoes.controller';
import { MateriaisModule } from './materiais/materiais.module';
import { GeminiModule } from './gemini/gemini.module'; 
import { ChatModule } from './chat/chat.module';
// 🌟 CORRIGIDO: Nome do membro importado alterado para ProtheusMockController
import { ProtheusMockController } from './integracao/protheus/protheus.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    AuthModule,
    MatriculaModule,
    TreinamentoModule, 
    QuizzesModule,
    CertificadosModule,
    ForumModule,
    KanbanModule,
    MateriaisModule,
    GeminiModule,
    ChatModule,   
  ],
  // 🌟 CORRIGIDO: Injetada a classe ProtheusMockController corretamente no array
  controllers: [UserController, NotificacoesController, ProtheusMockController],
  providers: [PrismaService, NotificacoesService],
})
export class AppModule {}
