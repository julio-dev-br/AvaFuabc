import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Serviços Globais do Core
import { AuthService } from '../../../core/services/auth.service';
import { AlertsService } from '../../../core/services/alerts.service';
import { environment } from '../../../../environments/environment'; // Ajuste o caminho se necessário

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.css'
})
export class CadastroComponent {
  private authService = inject(AuthService);
  private alerts = inject(AlertsService);
  private router = inject(Router);
  private http = inject(HttpClient);

  // Modelo reativo ligado bidirecionalmente ao HTML
  formularioCadastro = {
    name: '',
    email: '',
    cpf: '',
    password: '',
    confirmarPassword: ''
  };

  // Estados de controle da consulta ao Protheus
  isProcessando = false;
  isBuscandoCpf = false;
  colaboradorValidado = false;
  dadosProtheus: any = null;

    // Formata o CPF em tempo real (000.000.000-00) e bloqueia letras
  aplicarMascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não for dígito

    if (valor.length > 11) {
      valor = valor.slice(0, 11);
    }

    // Aplica os pontos e o traço progressivamente
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    this.formularioCadastro.cpf = valor;
    input.value = valor;
  }


  // 🔍 ETAPA 1: Disparada no (blur), Enter ou clique na lupa
  consultarCpfProtheus(): void {
    if (this.colaboradorValidado || this.isBuscandoCpf) return;

    const cpfLimpo = (this.formularioCadastro.cpf || '').replace(/\D/g, '');
    
    // Só dispara a requisição se o usuário realmente digitou algo
    if (!cpfLimpo) return;

    if (cpfLimpo.length !== 11) {
      this.alerts.erro('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    this.isBuscandoCpf = true;

    // Ajuste a URL base caso você não use environment.apiUrl (ex: 'http://localhost:3000')
    const baseUrl = (environment as any)?.apiUrl || 'http://localhost:3000';

    this.http.get<any>(`${baseUrl}/integracao/protheus/validar-cpf/${cpfLimpo}`).subscribe({
      next: (res) => {
        this.dadosProtheus = res;
        this.formularioCadastro.name = res.nome || '';
        this.formularioCadastro.email = res.email || '';
        this.colaboradorValidado = true;
        this.isBuscandoCpf = false;

      },
      error: (err) => {
        console.error('Erro ao validar CPF no Protheus:', err);
        const msgErro = err.error?.message || 'CPF não localizado na base ativa do RH.';
        this.alerts.erro(msgErro);
        this.isBuscandoCpf = false;
      }
    });
  }

  // ✏️ Permite resetar a busca caso o usuário queira digitar outro CPF
  limparValidacaoCpf(): void {
    this.colaboradorValidado = false;
    this.dadosProtheus = null;
    this.formularioCadastro.name = '';
    this.formularioCadastro.email = '';
    this.formularioCadastro.password = '';
    this.formularioCadastro.confirmarPassword = '';
  }

  executarAutoCadastro(): void {
    const { name, email, cpf, password, confirmarPassword } = this.formularioCadastro;

    if (!this.colaboradorValidado) {
      this.alerts.info('Valide seu CPF no RH antes de criar a conta.');
      return;
    }

    if (!name.trim() || !email.trim() || !cpf.trim() || !password.trim()) {
      this.alerts.erro('Por favor, preencha todos os campos do formulário.');
      return;
    }

    if (password !== confirmarPassword) {
      this.alerts.erro('A senha e a confirmação de senha não conferem.');
      return;
    }

    if (password.length < 6) {
      this.alerts.erro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    this.isProcessando = true;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      cpf: cpf.replace(/\D/g, ''),
      password: password
    };

    this.authService.signup(payload).subscribe({
      next: () => {
        this.alerts.sucesso('Cadastro realizado com sucesso! Bem-vindo ao Portal de Treinamentos FUABC.');
        this.isProcessando = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Erro ao processar auto-cadastro público:', err);
        const msgErro = err.error?.message || 'Falha ao processar o seu cadastro institucional.';
        this.alerts.erro(msgErro);
        this.isProcessando = false;
      }
    });
  }
}
