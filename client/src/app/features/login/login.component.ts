import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; 
import { HttpErrorResponse } from '@angular/common/http';
import { AlertsService } from '../../core/services/alerts.service';

import { AuthService } from '../../core/services/auth.service';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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