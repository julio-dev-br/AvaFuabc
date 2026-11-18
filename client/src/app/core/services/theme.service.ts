import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'ava-fuabc-theme';
  
  // Signal reativo para qualquer componente saber se está no modo escuro
  isDarkMode = signal<boolean>(false);

  constructor() {
    this.carregarTemaInicial();
  }

  private carregarTemaInicial(): void {
    const salvo = localStorage.getItem(this.STORAGE_KEY);
    if (salvo === 'dark') {
      this.ativarDarkMode(true);
    } else if (!salvo && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Opcional: respeita a preferência do sistema operacional se o usuário nunca escolheu
      this.ativarDarkMode(true);
    }
  }

  alternarTema(): void {
    this.ativarDarkMode(!this.isDarkMode());
  }

  private ativarDarkMode(ativar: boolean): void {
    this.isDarkMode.set(ativar);
    if (ativar) {
      document.body.classList.add('dark-theme');
      localStorage.setItem(this.STORAGE_KEY, 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem(this.STORAGE_KEY, 'light');
    }
  }
}
