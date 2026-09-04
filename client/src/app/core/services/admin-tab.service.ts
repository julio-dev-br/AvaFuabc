import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AdminTabService {
  public abaAtiva = signal<string>('bi');

  public mudarAba(aba: string): void {
    this.abaAtiva.set(aba);
  }
}
