import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  public isLoadingGlobal = signal<boolean>(false);

  // Métodos auxiliares para ligar/desligar com segurança
  showLoader(): void {
    this.isLoadingGlobal.set(true);
  }

  hideLoader(): void {
    this.isLoadingGlobal.set(false);
  }
}
