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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Abastece as variáveis .env para a aplicação toda
    }),
    AuthModule,
    MatriculaModule,
    TreinamentoModule, // 📦 Gerencia internamente o TreinamentoController e TreinamentoService
    QuizzesModule,
    CertificadosModule,
    ForumModule,
    KanbanModule,
    MateriaisModule,   // 📦 Gerencia internamente o MateriaisController e MateriaisService
  ],
  // ✅ CORRIGIDO: Removidos TreinamentoController e MateriaisController daqui
  controllers: [UserController, NotificacoesController],
  // ✅ CORRIGIDO: Removido TreinamentoService daqui para evitar conflito com o módulo
  providers: [PrismaService, NotificacoesService],
})
export class AppModule {}
