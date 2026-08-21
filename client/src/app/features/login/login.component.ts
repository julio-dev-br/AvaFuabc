import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertsService } from '../../core/services/alerts.service';

// Importa o serviço usando a nomenclatura padrão exata do Angular 17
import { AuthService } from '../../core/services/auth.service';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private alerts = inject(AlertsService); 

  email = '';
  password = '';
  isLoading = false;

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.alerts.erro('Por favor, preencha todos os campos.');
      return;
    }

    this.isLoading = true;

    this.authService.signin({ email: this.email, password: this.password }).subscribe({
      next: (response: any) => { // Mudado para 'any' temporariamente para depuração
        this.isLoading = false;

        this.alerts.sucesso('Acesso autorizado! Seja bem-vindo ao AVA.');

        // Captura a role convertendo para letras minúsculas para evitar erros de caixa alta/baixa
        const userRole = response.role ? response.role.toLowerCase() : '';

        // Redirecionamento baseado no perfil de acesso verificado
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
