import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackbarSucessoComponent } from '../../features/admin-dashboard/snackbar-sucesso.component';
import { SnackbarErroComponent } from '../../features/admin-dashboard/snackbar-erro.component'; // 🌟 IMPORTADO

@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  private snackBar = inject(MatSnackBar);

  sucesso(msg: string): void {
    this.snackBar.openFromComponent(SnackbarSucessoComponent, {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      data: msg,
      panelClass: ['snackbar-container-limpo']
    });
  }

  erro(msg: string): void {
    this.snackBar.openFromComponent(SnackbarErroComponent, {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      data: msg,
      panelClass: ['snackbar-container-limpo'] 
    });
  }
}
