import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
  selector: 'app-snackbar-erro',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  // No seu template, aplique a mesma alteração no botão do lado direito:
  template: `
  <div style="display: flex; align-items: center; justify-content: space-between; min-width: 320px; padding: 14px 16px; background-color: #e11d48 !important; border-radius: 6px; margin: -14px -24px; box-shadow: 0 6px 16px rgba(225, 29, 72, 0.2); font-family: 'Roboto', sans-serif; position: relative; overflow: hidden;">
    <div style="display: flex; align-items: center; gap: 10px; padding-bottom: 2px;">
      <mat-icon style="color: #ffffff !important; vertical-align: middle;">error</mat-icon>
      <span style="color: #ffffff !important; font-size: 14px; font-weight: 600; line-height: 1.4; letter-spacing: -0.2px;">
        {{ data }}
      </span>
    </div>
    <button mat-icon-button (click)="snackBarRef.dismissWithAction()" 
            style="color: rgba(255, 255, 255, 0.7) !important; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; min-width: auto; padding: 0; margin-left: 16px; z-index: 10; border: none; background: transparent; cursor: pointer; transition: color 0.2s;"
            onmouseover="this.style.color='#ffffff'"
            onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'">
      <mat-icon style="font-size: 18px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; margin: 0; color: inherit;">close</mat-icon>
    </button>
    <div class="toastr-progress-erro"></div>
  </div>`,
  // 2. Nos styles abaixo, deixe apenas a fiação da linha regressiva:
  styles: [`
  @keyframes toastrProgress {
    from { width: 100%; }
    to { width: 0%; }
  }
  .toastr-progress-erro {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.4);
    animation: toastrProgress 5000ms linear forwards;
  }
`]
})
export class SnackbarErroComponent {
  public data = inject(MAT_SNACK_BAR_DATA);
  public snackBarRef = inject(MatSnackBarRef<SnackbarErroComponent>);
}
