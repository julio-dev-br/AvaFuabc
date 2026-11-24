import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../core/services/user.service';
import { AlertsService } from '../../core/services/alerts.service';
import { environment } from '../../../environments/environment';

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
  private alerts = inject(AlertsService);
  private http = inject(HttpClient);

  userDataSource = new MatTableDataSource<any>([]);
  exibirFormularioCadastro = false;
  isLoading = true;
  isSalvando = false;
  isBuscandoCpf = false;

  dadosProtheus: any = null;
  cpfJaConsultado = '';

  colunasTabela: string[] = ['nome', 'email', 'lotacao', 'cargo', 'role', 'status'];

  novoUsuario = {
    name: '',
    email: '',
    cpf: '',
    role: 'user',
    password: ''
  };

  ngOnInit(): void {
    this.carregarColaboradores();
  }

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

  aplicarFiltro(event: Event): void {
    const valorFiltro = (event.target as HTMLInputElement).value;
    this.userDataSource.filter = valorFiltro.trim().toLowerCase();
  }

  aplicarMascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '').slice(0, 11);

    if (valor.length > 9) {
      valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (valor.length > 6) {
      valor = valor.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (valor.length > 3) {
      valor = valor.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    this.novoUsuario.cpf = valor;
    input.value = valor;

    if (valor.replace(/\D/g, '') !== this.cpfJaConsultado) {
      this.dadosProtheus = null;
    }
  }

  consultarCpfProtheus(): void {
    const cpfLimpo = this.novoUsuario.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11 || this.isBuscandoCpf || cpfLimpo === this.cpfJaConsultado) {
      return;
    }

    this.isBuscandoCpf = true;
    this.cpfJaConsultado = cpfLimpo;

    this.http.get<any>(`${environment.apiUrl}/integracao/protheus/validar-cpf/${cpfLimpo}`).subscribe({
      next: (dados) => {
        this.dadosProtheus = dados;
        if (dados.nome) this.novoUsuario.name = dados.nome;
        if (dados.email) this.novoUsuario.email = dados.email;
        this.isBuscandoCpf = false;
        this.alerts.sucesso(`Vínculo localizado no Protheus: ${dados.nome}`);
      },
      error: (err) => {
        this.dadosProtheus = null;
        this.cpfJaConsultado = '';
        this.isBuscandoCpf = false;
        const msg = err.error?.message || 'CPF não localizado na base ativa do Protheus.';
        this.alerts.erro(msg);
      }
    });
  }

  salvarUsuario(): void {
    if (!this.novoUsuario.name || !this.novoUsuario.email || !this.novoUsuario.cpf) {
      this.alerts.erro('Por favor, preencha todos os campos obrigatórios, incluindo o CPF.');
      return;
    }

    this.isSalvando = true;

    this.userService.cadastrarNovoColaborador(this.novoUsuario).subscribe({
      next: () => {
        this.alerts.sucesso('Colaborador validado no Protheus e cadastrado com sucesso! 🏆');
        this.carregarColaboradores();
        this.resetarFormulario();
        this.isSalvando = false;
      },
      error: (err) => {
        console.error('Erro ao salvar colaborador administrativo:', err);
        const msgErro = err.error?.message || 'Falha ao processar o cadastro do usuário.';
        this.alerts.erro(msgErro);
        this.isSalvando = false;
      }
    });
  }

  mudarStatus(usuario: any): void {
    this.userService.alternarStatusAcesso(usuario.id).subscribe({
      next: () => {
        usuario.ativo = !usuario.ativo;
        this.alerts.sucesso(`Status de ${usuario.name} alterado com sucesso!`);
      },
      error: (err) => {
        console.error('Erro ao mudar status do usuário:', err);
        this.alerts.erro('Não foi possível alterar o status de acesso.');
      }
    });
  }

  resetarFormulario(): void {
    this.novoUsuario = {
      name: '',
      email: '',
      cpf: '',
      role: 'user',
      password: ''
    };
    this.dadosProtheus = null;
    this.cpfJaConsultado = '';
    this.exibirFormularioCadastro = false;
  }
}
