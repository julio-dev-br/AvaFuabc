import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
  selector: 'app-snackbar-erro',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  // 🌟 ESTILO INLINE FORÇADO: Margem negativa expande e cobre 100% do cinza padrão com Vermelho Corporativo!
  template: `
    <div style="display: flex; align-items: center; justify-content: space-between; min-width: 320px; padding: 10px 16px; background-color: #c62828 !important; border-radius: 6px; margin: -14px -24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: 'Roboto', sans-serif;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <mat-icon style="color: #ffffff !important; vertical-align: middle;">error</mat-icon>
        <span style="color: #ffffff !important; font-size: 14px; font-weight: 500; line-height: 1.4;">
          {{ data }}
        </span>
      </div>
      <button mat-button (click)="snackBarRef.dismissWithAction()" 
              style="color: #ffffff !important; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; min-width: auto; padding: 0 8px; margin-left: 16px;">
        Fechar
      </button>
    </div>
  `
})
export class SnackbarErroComponent {
  public data = inject(MAT_SNACK_BAR_DATA);
  public snackBarRef = inject(MatSnackBarRef<SnackbarErroComponent>);
}
