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
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Injeção de Alertas Globais para emitir pop-ups de erro amigáveis do Protheus
import { AlertsService } from '../../core/services/alerts.service';

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
    MatToolbarModule,
    MatProgressBarModule
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class ControleUsuariosComponent implements OnInit {
  private userService = inject(UserService);
  private alerts = inject(AlertsService); // 🚀 Injetado motor de feedbacks visuais

  // Estados de Controle da Tela
  userDataSource = new MatTableDataSource<any>([]);
  exibirFormularioCadastro = false;
  isLoading = true;
  isSalvando = false;

  // Cabeçalhos que a tabela do Material exige mapear no HTML
  colunasTabela: string[] = ['nome', 'email', 'lotacao', 'cargo', 'role', 'status'];

  // 🚀 MODELO ATUALIZADO: Eliminado os IDs manuais fictícios chumbados!
  // Agora o formulário trabalha focado na validação regulamentar por CPF!
  novoUsuario = {
    name: '',
    email: '',
    cpf: '', // 🌟 Campo mestre de integração com o Protheus Mock
    role: 'user',
    password: '' // Opcional (Se deixar vazio, o back-end assume a senha padrão)
  };

  ngOnInit(): void {
    this.carregarColaboradores();
  }

  // 📋 ROTA ADMINISTRATIVA: Busca os funcionários cadastrados no PostgreSQL
  carregarColaboradores(): void {
    this.isLoading = true;
    this.userService.listarTodosColaboradores().subscribe({
      next: (dados) => {
        this.userDataSource.data = dados;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao buscar colaboradores:', err);
        this.isLoading = false;
      }
    });
  }

  // 🔍 Filtro de Pesquisa Inteligente em Tempo Real
  aplicarFiltro(event: Event): void {
    const valorFiltro = (event.target as HTMLInputElement).value;
    this.userDataSource.filter = valorFiltro.trim().toLowerCase();
  }

  // 💾 ROTA ADMINISTRATIVA: Envia o payload com o CPF para a checagem síncrona do Protheus
  salvarUsuario(): void {
    if (!this.novoUsuario.name || !this.novoUsuario.email || !this.novoUsuario.cpf) {
      this.alerts.erro('Por favor, preencha todos os campos obrigatórios, incluindo o CPF.');
      return;
    }
    
    this.isSalvando = true;

    console.log('=== DISPARANDO ADMISSÃO DIGITAL VIA PROTHEUS CPF ===', this.novoUsuario);

    this.userService.cadastrarNovoColaborador(this.novoUsuario).subscribe({
      next: () => {
        this.alerts.sucesso('Colaborador validado no Protheus e cadastrado com sucesso! 🏆');
        this.carregarColaboradores(); // Força a atualização imediata da listagem
        this.resetarFormulario();
        this.isSalvando = false;
      },
      error: (err) => {
        console.error('Erro ao salvar colaborador administrativo:', err);
        // Exibe o erro de negócio direto da validação do Protheus Mock (ex: CPF não localizado)
        const msgErro = err.error?.message || 'Falha ao processar o cadastro do usuário.';
        this.alerts.erro(msgErro);
        this.isSalvando = false;
      }
    });
  }

  // ⚡ ROTA ADMINISTRATIVA: Alterna a ativação lógica no PostgreSQL via Slide Toggle
  mudarStatus(usuario: any): void {
    this.userService.alternarStatusAcesso(usuario.id).subscribe({
      next: () => {
        usuario.ativo = !usuario.ativo; // Sincroniza o toggle instantaneamente
        this.alerts.sucesso(`Status de ${usuario.name} alterado com sucesso!`);
      },
      error: (err) => {
        console.error('Erro ao mudar status do usuário:', err);
        this.alerts.erro('Não foi possível alterar o status de acesso.');
      }
    });
  }

  // Limpa os campos do formulário redefinindo as propriedades para o novo contrato
  resetarFormulario(): void {
    this.novoUsuario = {
      name: '',
      email: '',
      cpf: '',
      role: 'user',
      password: ''
    };
    this.exibirFormularioCadastro = false;
  }
}
