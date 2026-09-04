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
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', redirectTo: 'dashboard/cursos', pathMatch: 'full' },
      { path: 'dashboard/cursos', component: DashboardComponent, data: { breadcrumb: 'Treinamentos', scope: 'aluno' } },
      { path: 'dashboard/progresso', component: DashboardComponent, data: { breadcrumb: 'Meu Progresso', scope: 'aluno' } },
      { path: 'dashboard/kanban', component: KanbanBoardComponent, data: { breadcrumb: 'Trilhas Especiais', scope: 'aluno' } },
      { path: 'dashboard/curso/:id', component: CursoPlayerComponent, data: { breadcrumb: 'Player', scope: 'aluno' } },
      { path: 'dashboard/quiz/aula/:id', component: QuizComponent, data: { breadcrumb: 'Avaliação Regulamentar', scope: 'aluno' } },
      { path: 'dashboard/forum/aula/:id', component: ForumComponent, data: { breadcrumb: 'Fórum Técnico', scope: 'aluno' } },
      { path: 'dashboard/perfil', component: PerfilComponent, data: { breadcrumb: 'Meu Perfil', scope: 'aluno' } },

      { path: 'admin', redirectTo: 'admin/bi', pathMatch: 'full' },
      { path: 'admin/bi', component: AdminDashboardComponent, data: { breadcrumb: 'Dashboard de BI', scope: 'admin', aba: 'bi' } },
      { path: 'admin/cadastro', component: AdminDashboardComponent, data: { breadcrumb: 'Fábrica de Conteúdos', scope: 'admin', aba: 'cadastro' } },
      { path: 'admin/comunicados', component: AdminDashboardComponent, data: { breadcrumb: 'Gestão de Comunicados', scope: 'admin', aba: 'comunicados' } },
      { path: 'admin/usuarios', component: AdminDashboardComponent, data: { breadcrumb: 'Perfis de Acesso', scope: 'admin', aba: 'usuarios' } },
      { path: 'admin/projetos', component: AdminDashboardComponent, data: { breadcrumb: 'Projetos Kanban', scope: 'admin', aba: 'projetos' } }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
