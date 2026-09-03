import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AdminTabService {
  // 🌟 O SIGNAL MÁGICO: Guarda a aba administrativa ativa em tempo real
  public abaAtiva = signal<string>('bi');

  public mudarAba(aba: string): void {
    this.abaAtiva.set(aba);
    console.log(`=== 🛡️ ADMIN TAB SERVICE: Chaveado para a aba [${aba}] ===`);
  }
}
