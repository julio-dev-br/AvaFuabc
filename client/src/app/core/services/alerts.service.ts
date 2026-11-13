import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackbarSucessoComponent } from '../../features/admin-dashboard/snackbar-sucesso.component';
import { SnackbarErroComponent } from '../../features/admin-dashboard/snackbar-erro.component';
import { SnackbarInfoComponent } from '../../features/admin-dashboard/snackbar-info.component';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  private snackBar = inject(MatSnackBar);

  // Pop-up Verde de Sucesso (Topo à Direita)
  sucesso(msg: string): void {
    this.snackBar.openFromComponent(SnackbarSucessoComponent, {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      data: msg,
      panelClass: ['snackbar-container-limpo']
    });
  }

  // Pop-up Azul de Informação (Topo à Direita)
  info(msg: string): void {
    this.snackBar.openFromComponent(SnackbarInfoComponent, {
      duration: 4500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      data: msg,
      panelClass: ['snackbar-container-limpo']
    });
  }

  // Pop-up Vermelho de Erro (Topo à Direita)
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
