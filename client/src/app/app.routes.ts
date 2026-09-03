import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { LayoutComponent } from './core/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CursoPlayerComponent } from './features/curso-player/curso-player.component';
import { KanbanBoardComponent } from './features/kanban-board/kanban-board.component';
import { QuizComponent } from './features/quiz/quiz.component';
import { ForumComponent } from './features/forum/forum.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Rota inicial pública redireciona para o Login corporativo
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // 🌟 O GRANDE TRUQUE: O LayoutComponent agora envelopa a casca TANTO do Aluno quanto do Admin!
  { 
    path: '', 
    component: LayoutComponent, 
    canActivate: [authGuard],
    children: [
      // 🎓 Sub-rotas do Ecossistema do Aluno
      { path: 'dashboard', redirectTo: 'dashboard/cursos', pathMatch: 'full' },
      { path: 'dashboard/cursos', component: DashboardComponent },
      { path: 'dashboard/progresso', component: DashboardComponent },
      { path: 'dashboard/kanban', component: KanbanBoardComponent },
      { path: 'dashboard/curso/:id', component: CursoPlayerComponent },
      { path: 'dashboard/quiz/aula/:id', component: QuizComponent },
      { path: 'dashboard/forum/aula/:id', component: ForumComponent },
      { path: 'dashboard/perfil', component: PerfilComponent },

      // 🛡️ Sub-rota do Painel de Gestão (Agora rodando protegido dentro do Layout Mestre!)
      { path: 'admin', component: AdminDashboardComponent }
    ]
  },
  
  // Fallback de segurança para caminhos inexistentes
  { path: '**', redirectTo: 'login' }
];
