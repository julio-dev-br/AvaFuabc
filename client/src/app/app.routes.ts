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
  // Rota inicial pública redireciona para o Login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Quem entra aqui herda a Sidebar e o Header automaticamente!
  { 
    path: 'dashboard', 
    component: LayoutComponent, 
    canActivate: [authGuard],
    children: [
      // Injetadas dinamicamente dentro do <router-outlet> do painel central
      { path: '', redirectTo: 'cursos', pathMatch: 'full' },
      { path: 'cursos', component: DashboardComponent },
      { path: 'progresso', component: DashboardComponent },
      { path: 'kanban', component: KanbanBoardComponent },
      { path: 'curso/:id', component: CursoPlayerComponent },
      { path: 'quiz/aula/:id', component: QuizComponent },
      { path: 'forum/aula/:id', component: ForumComponent },
      { path: 'perfil', component: PerfilComponent }
    ]
  },

  // Painel Administrativo do RH isolado do escopo do aluno
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard] },
  
  // Fallback de segurança para caminhos inexistentes
  { path: '**', redirectTo: 'login' }
];
