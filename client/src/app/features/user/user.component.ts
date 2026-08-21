import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';

// Angular Material Components
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatToolbarModule
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class ControleUsuariosComponent implements OnInit {
  // 🌟 INJEÇÃO DO SERVIÇO UNIFICADO DO PROJETO
  private userService = inject(UserService);

  // Estados de Controle da Tela
  userDataSource = new MatTableDataSource<any>([]);
  exibirFormularioCadastro = false;
  isLoadingUsuarios = true;
  isSalvando = false;

  // Cabeçalhos que a tabela do Material exige mapear no HTML
  colunasTabela: string[] = ['nome', 'email', 'lotacao', 'cargo', 'role', 'status'];

  // Modelo do Formulário alinhado estritamente com o DTO/Interface que o NestJS valida
  novoUsuario = {
    name: '',
    email: '',
    role: 'user',
    empresa_id: 1,      // Fundação ABC de Apoio Padrão
    unidade_id: 1,      // Hospital Central de Santo André
    departamento_id: 1, // Pronto-Socorro
    cargo_id: 1         // Técnico de Enfermagem
  };

  ngOnInit(): void {
    this.carregarColaboradores();
  }

  // 📋 ROTA ADMINISTRATIVA: Busca os funcionários cadastrados no PostgreSQL
  carregarColaboradores(): void {
    this.isLoadingUsuarios = true;
    this.userService.listarTodosColaboradores().subscribe({
      next: (dados) => {
        this.userDataSource.data = dados;
        this.isLoadingUsuarios = false;
      },
      error: (err) => {
        console.error('Erro ao buscar colaboradores:', err);
        this.isLoadingUsuarios = false;
      }
    });
  }

  // 🔍 Filtro de Pesquisa Inteligente em Tempo Real
  aplicarFiltro(event: Event): void {
    const valorFiltro = (event.target as HTMLInputElement).value;
    this.userDataSource.filter = valorFiltro.trim().toLowerCase();
  }

  // 💾 ROTA ADMINISTRATIVA: Cadastra um novo colaborador enviando as chaves do RH
  salvarUsuario(): void {
    if (!this.novoUsuario.name || !this.novoUsuario.email) return;
    this.isSalvando = true;

    this.userService.cadastrarNovoColaborador(this.novoUsuario).subscribe({
      next: () => {
        this.carregarColaboradores(); // Força a atualização da tabela na hora
        this.resetarFormulario();
        this.isSalvando = false;
      },
      error: (err) => {
        console.error('Erro ao salvar colaborador administrativo:', err);
        this.isSalvando = false;
      }
    });
  }

  // ⚡ ROTA ADMINISTRATIVA: Alterna a ativação lógica no PostgreSQL via Slide Toggle
  mudarStatus(usuario: any): void {
    this.userService.alternarStatusAcesso(usuario.id).subscribe({
      next: () => {
        usuario.ativo = !usuario.ativo; // Mantém o toggle visual sincronizado com o banco
      },
      error: (err) => {
        console.error('Erro ao mudar status do usuário:', err);
      }
    });
  }

  // Limpa os campos do formulário para novos cadastros
  resetarFormulario(): void {
    this.novoUsuario = {
      name: '',
      email: '',
      role: 'user',
      empresa_id: 1,
      unidade_id: 1,
      departamento_id: 1,
      cargo_id: 1
    };
    this.exibirFormularioCadastro = false;
  }
}
