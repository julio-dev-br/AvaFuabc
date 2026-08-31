import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding: 24px; text-align: center; max-width: 380px; font-family: 'Inter', sans-serif;">
      <!-- Ícone Alerta Corporativo -->
      <div style="background-color: #fef2f2; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
        <mat-icon style="color: #dc2626; font-size: 28px; width: 28px; height: 28px;">warning_outline</mat-icon>
      </div>

      <!-- Título e Mensagem -->
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">{{ data.titulo }}</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">{{ data.mensagem }}</p>

      <!-- Botões de Ação Simétricos -->
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button mat-stroked-button style="border-color: #cbd5e1; color: #475569; font-weight: 600; padding: 0 20px; border-radius: 6px; height: 40px;" (click)="dialogRef.close(false)">
          Cancelar
        </button>
        <button mat-flat-button style="background-color: #dc2626; color: #ffffff; font-weight: 600; padding: 0 20px; border-radius: 6px; height: 40px;" (click)="dialogRef.close(true)">
          Excluir
        </button>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  public dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  public data = inject(MAT_DIALOG_DATA); // Recebe { titulo, mensagem } vindo da chamada
}
