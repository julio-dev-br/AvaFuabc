import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CursoPlayerComponent } from './features/curso-player/curso-player.component';
import { KanbanBoardComponent } from './features/kanban-board/kanban-board.component';
import { QuizComponent } from './features/quiz/quiz.component';
import { ForumComponent } from './features/forum/forum.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Rota inicial redireciona para o Login público
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Rotas Protegidas: O Angular valida o token antes de permitir desenhar a tela
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'curso/:id', component: CursoPlayerComponent, canActivate: [authGuard] },
  { path: 'kanban', component: KanbanBoardComponent, canActivate: [authGuard] },
  { path: 'quiz/aula/:id', component: QuizComponent, canActivate: [authGuard] },
  { path: 'forum/aula/:id', component: ForumComponent, canActivate: [authGuard] },
  { path: 'perfil', component: PerfilComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard] },
  
  // Fallback para rotas inexistentes ou tentativas de invasão
  { path: '**', redirectTo: 'login' }
];
