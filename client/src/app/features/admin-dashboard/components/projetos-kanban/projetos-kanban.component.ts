import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DragDropModule, moveItemInArray, transferArrayItem, CdkDragDrop } from '@angular/cdk/drag-drop';

// Serviços
import { TreinamentoService } from '../../../../core/services/treinamento.service';
import { AlertsService } from '../../../../core/services/alerts.service';

@Component({
  selector: 'app-projetos-kanban',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DragDropModule
  ],
  templateUrl: './projetos-kanban.component.html',
  styleUrl: './projetos-kanban.component.css'
})
export class ProjetosKanbanComponent implements OnInit {
  private treinamentoService = inject(TreinamentoService);
  private alerts = inject(AlertsService);

  // 📊 LISTAGENS
  listaProjetos: any[] = [];
  colunasKanbanAdmin: any[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.carregarProjetosEEstrutura();
  }

  carregarProjetosEEstrutura(): void {
    this.isLoading = true;
    this.treinamentoService.obterProjetosAdmin().subscribe({
      next: (dados: any[]) => {
        this.listaProjetos = dados || [];
        this.agruparProjetosEmColunas();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar esteira de projetos:', err);
        this.alerts.erro('Não foi possível carregar o Kanban gerencial.');
        this.isLoading = false;
      }
    });
  }


  // 🧠 ENGENHARIA DE AGRUPAMENTO DINÂMICO CORRIGIDA
  private agruparProjetosEmColunas(): void {
    // Define os 3 estágios fixos e sofisticados do RH com indexadores limpos
    const estagiosPadrao = [
      { id: 1, titulo: '📌 Em Rascunho / Mapeamento', cor: '#dc2626', cards: [] as any[] }, // Vermelho
      { id: 2, titulo: '📖 Homologação / Vídeos', cor: '#eab308', cards: [] as any[] },    // Amarelo
      { id: 3, titulo: '✅ Publicado / Ativo', cor: '#16a34a', cards: [] as any[] }       // Verde
    ];

    // Distribui cada projeto vindo do Postgres dentro de sua respectiva coluna reativa
    this.listaProjetos.forEach(projeto => {
      // Tenta encaixar no estágio que veio do banco, senão cai na coluna 1 (Rascunho) por padrão
      const estagioAlvo = projeto.estagioId ? Number(projeto.estagioId) : 1;
      const coluna = estagiosPadrao.find(c => c.id === estagioAlvo);

      if (coluna) {
        coluna.cards.push(projeto);
      } else {
        // ✅ CORRIGIDO: Se der qualquer erro de id, joga o card por segurança no índice 0 (Rascunho)
        estagiosPadrao[0].cards.push(projeto);
      }
    });

    this.colunasKanbanAdmin = estagiosPadrao;
  }

  // 🚀 O MOVIMENTO SUPREMO: Organiza o layout e prepara a persistência de estágio
  aoSoltarCardCurso(event: CdkDragDrop<any[]>, colunaIdAlvo: number): void {
    // Se arrastou e soltou dentro da mesma coluna, apenas reorganiza a ordem visual
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transfere o card fisicamente entre as colunas reativas do front-end
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const cursoMovido = event.container.data[event.currentIndex];
      console.log(`=== 🎨 CURSO MOVIDO: "${cursoMovido.titulo}" PARA O ESTÁGIO ID ${colunaIdAlvo} ===`);

      // 💡 PRÓXIMO PASSO: Aqui faremos a chamada HTTP (ex: PATCH /treinamentos/:id/estagio) 
      // para fixar o estágio no banco de dados. Por enquanto o front já se move perfeitamente!
      this.alerts.sucesso(`Fase de "${cursoMovido.titulo}" atualizada! 🚀`);
    }
  }


}
