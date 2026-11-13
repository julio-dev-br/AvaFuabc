import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; 
import { HttpErrorResponse } from '@angular/common/http';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon'; 
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink, 
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule, 
    MatProgressBarModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private alerts = inject(AlertsService);

  cpf = '';
  password = '';
  isLoading = false;

  aplicarMascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');

    if (valor.length > 11) {
      valor = valor.slice(0, 11);
    }

    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    this.cpf = valor;
    input.value = valor;
  }

  onSubmit(): void {
    const cpfLimpo = (this.cpf || '').replace(/\D/g, '');

    if (!cpfLimpo || !this.password) {
      this.alerts.erro('Por favor, preencha o CPF e a senha.');
      return;
    }

    if (cpfLimpo.length !== 11) {
      this.alerts.erro('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    this.isLoading = true;

    this.authService.signin({ cpf: cpfLimpo, password: this.password }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.alerts.sucesso('Acesso autorizado! Seja bem-vindo ao AVA.');

        const userRole = response.role ? response.role.toLowerCase() : '';

        if (userRole === 'admin' || userRole === 'manager') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        const mensagemErro = err.error?.message || 'Erro ao conectar ao servidor.';
        this.alerts.erro(mensagemErro);
      }
    });
  }
}
