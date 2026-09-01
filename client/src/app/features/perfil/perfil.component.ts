import { Component, OnInit, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

// Angular Material Components para Layout Premium
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AlertsService } from '../../core/services/alerts.service';
import { UserService } from '../../core/services/user.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private alerts = inject(AlertsService);

  private readonly apiUrl = `${environment.apiUrl}`;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // DataSource nativo que gerencia a tabela do histórico
  historicoMatriculas = new MatTableDataSource<any>([]);

  isLoading = true;
  colunasTabela = ['treinamento', 'progresso', 'nota', 'status', 'acoes'];

  // Separa responsabilidades na interface
  abaPerfilAtiva: 'dados' | 'certificados' = 'dados';

  // MODELOS REATIVOS DO FORMULÁRIO DE SEGURANÇA
  senhaAtual: string = '';
  novaSenha: string = '';
  confirmarSenha: string = '';

  // Objeto recheado dinamicamente pelo PostgreSQL via Prisma
  usuario = {
    nome: '',
    email: '',
    empresa: '',
    unidade: '',
    cargo: '',
    avatarUrl: 'assets/default-avatar.jpg'
  };

  ngOnInit(): void {
    this.carregarDadosPerfilReal();
    this.carregarHistoricoAcademico();
  }

  ngAfterViewInit(): void {
    this.historicoMatriculas.paginator = this.paginator;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  aplicarFiltroHistorico(event: Event): void {
    const valorFiltro = (event.target as HTMLInputElement).value;
    this.historicoMatriculas.filter = valorFiltro.trim().toLowerCase();

    if (this.historicoMatriculas.paginator) {
      this.historicoMatriculas.paginator.firstPage();
    }
  }

  carregarHistoricoAcademico(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/treinamentos/disponiveis`, { headers: this.getHeaders() }).subscribe({
      next: (dados: any[]) => {
        const listaMapeada = dados.map((curso: any) => {
          const m = (curso.matriculas && curso.matriculas.length > 0) ? curso.matriculas[0] : (curso.matricula || null);

          let progressoReal = 0;
          let notaReal: number | null = null;

          if (m) {
            progressoReal = m.progresso !== undefined && m.progresso !== null ? Number(m.progresso) : 0;
            notaReal = m.nota !== undefined && m.nota !== null ? Number(m.nota) : null;
          }

          const isElegivel = progressoReal === 100 && notaReal !== null && notaReal >= 7;

          return {
            id: curso.id,
            titulo: curso.titulo,
            progresso: progressoReal,
            nota: notaReal,
            elegivel: isElegivel
          };
        });

        this.historicoMatriculas.data = listaMapeada;

        setTimeout(() => {
          this.historicoMatriculas.paginator = this.paginator;
        });

        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao buscar histórico acadêmico:', err);
        this.isLoading = false;
      }
    });
  }

  carregarDadosPerfilReal(): void {
    this.http.get<any>(`${this.apiUrl}/user/perfil/me`, { headers: this.getHeaders() }).subscribe({
      next: (dados) => {
        this.usuario.nome = dados.nome;
        this.usuario.email = dados.email;
        this.usuario.empresa = dados.empresa;
        this.usuario.unidade = dados.unidade;
        this.usuario.cargo = dados.cargo;
        if (dados.avatarUrl) {
          this.usuario.avatarUrl = dados.avatarUrl;
        }
      },
      error: (err) => console.error('Erro ao carregar dados cadastrais do Postgres:', err)
    });
  }

  salvarNovaSenha(): void {
    if (!this.senhaAtual.trim() || !this.novaSenha.trim() || !this.confirmarSenha.trim()) {
      this.snackBar.open('Todos os campos de senha são obrigatórios!', 'Fechar', { duration: 4000, verticalPosition: 'top' });
      return;
    }

    if (this.novaSenha !== this.confirmarSenha) {
      this.snackBar.open('A nova senha e a confirmação não conferem.', 'Fechar', { duration: 4000, verticalPosition: 'top' });
      return;
    }

    const payload = {
      senhaAtual: this.senhaAtual,
      novaSenha: this.novaSenha
    };

    this.http.patch(`${this.apiUrl}/user/perfil/senha`, payload, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.alerts.sucesso('Senha atualizada com sucesso no ecossistema!');
        this.senhaAtual = '';
        this.novaSenha = '';
        this.confirmarSenha = '';
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message || 'Erro ao atualizar sua senha corporativa.';
        // this.snackBar.open(msg, 'Fechar', { duration: 4000, verticalPosition: 'top' });
        this.alerts.erro(msg);
      }
    });
  }

  onFileSelected(event: any): void {
    const arquivo: File = event.target.files[0];
    if (!arquivo) return;

    this.userService.atualizarFotoPerfil(arquivo).subscribe({
      next: (res) => {
        this.usuario.avatarUrl = res.avatar_url;
        this.snackBar.open('Foto de perfil atualizada com sucesso!', 'Fechar', { duration: 3000, verticalPosition: 'top' });
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message || 'Erro ao fazer upload da imagem.';
        this.snackBar.open(msg, 'Fechar', { duration: 4000, verticalPosition: 'top' });
      }
    });
  }

  baixarCertificado(treinamentoId: number, tituloCurso: string): void {
    const url = `${this.apiUrl}/certificados/treinamento/${treinamentoId}`;

    this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const urlBlob = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlBlob;
        link.download = `Certificado - ${tituloCurso}.pdf`;
        link.click();
        window.URL.revokeObjectURL(urlBlob);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao baixar PDF do certificado:', err);
      }
    });
  }

  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
