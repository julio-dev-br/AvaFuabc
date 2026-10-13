import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

  // Modelo reativo ligado bidirecionalmente ao HTML corporativo
  formularioCadastro = {
    name: '',
    email: '',
    cpf: '',
    password: '',
    confirmarPassword: ''
  };

  isProcessando = false;

  executarAutoCadastro(): void {
    const { name, email, cpf, password, confirmarPassword } = this.formularioCadastro;

    // Validações básicas de segurança na porteira do front-end
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
      cpf: cpf.replace(/\D/g, ''), // Envia o CPF limpo (apenas números) para o NestJS
      password: password
    };

    console.log('=== DISPARANDO AUTO-ADMISSÃO PÚBLICA VIA CPF ===', payload);

    this.authService.signup(payload).subscribe({
      next: () => {
        this.alerts.sucesso('Cadastro realizado com sucesso! Sua lotação foi identificada via Protheus. 🏆');
        this.isProcessando = false;
        // Redireciona o aluno direto para a tela de login para acessar a plataforma
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Erro ao processar auto-cadastro público:', err);
        // Captura o erro síncrono de RH disparado pelo NestJS (Ex: CPF não localizado)
        const msgErro = err.error?.message || 'Falha ao processar o seu cadastro institucional.';
        this.alerts.erro(msgErro);
        this.isProcessando = false;
      }
    });
  }
}