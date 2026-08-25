import { Component, OnInit, inject, ViewChild, AfterViewInit } from '@angular/core'; // 🌟 Ajustado ViewChild aqui
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { MatTableDataSource } from '@angular/material/table'; 

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = `${environment.apiUrl}`;

  // O RADAR DO HTML: Captura o componente do paginador quando a tela terminar de desenhar
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  //  DECLARAÇÃO DO DATASOURCE NATIVO: Agora com o plural 's' e inicializado com a classe do Material
  historicoMatriculas = new MatTableDataSource<any>([]);

  isLoading = true;
  colunasTabela = ['treinamento', 'progresso', 'nota', 'status', 'acoes'];

  usuario = {
    nome: 'Julio Valente',
    email: 'julio@fuabc.org.br',
    empresa: 'Fundação do ABC',
    unidade: 'Hospital Central',
    cargo: 'Colaborador Corporativo',
    avatarUrl: 'https://st5.depositphotos.com/89768192/81688/v/450/depositphotos_816882272-stock-illustration-minimalist-dark-gray-profile-icon.jpg'
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

  // 🔍 FUNÇÃO DE FILTRO: Filtra as linhas nativamente na velocidade do clique
  aplicarFiltroHistorico(event: Event): void {
    const valorFiltro = (event.target as HTMLInputElement).value;
    this.historicoMatriculas.filter = valorFiltro.trim().toLowerCase();

    if (this.historicoMatriculas.paginator) {
      this.historicoMatriculas.paginator.firstPage();
    }
  }

  carregarHistoricoAcademico(): void {
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

        // Injeta o array tratado no DataSource nativo
        this.historicoMatriculas.data = listaMapeada;

        // Vincula o paginador de forma assíncrona segura
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
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.get<any>(`${this.apiUrl}/auth/me`, { headers }).subscribe({
      next: (dados) => {
        this.usuario.nome = dados.name;
        this.usuario.email = dados.email;
        if (dados.avatar_url) {
          this.usuario.avatarUrl = dados.avatar_url;
        }
      },
      error: (err) => console.error('Erro ao carregar dados cadastrais:', err)
    });
  }

  onFileSelected(event: any): void {
    const arquivo: File = event.target.files[0];
    if (!arquivo) return;

    this.userService.atualizarFotoPerfil(arquivo).subscribe({
      next: (res) => {
        this.usuario.avatarUrl = res.avatar_url;
        this.snackBar.open('Foto de perfil updated com sucesso!', 'Fechar', { duration: 3000, verticalPosition: 'top' });
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
