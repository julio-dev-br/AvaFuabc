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
import { KanbanService } from '../../../../core/services/kanban.service';
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
  private kanbanService = inject(KanbanService);
  private alerts = inject(AlertsService);

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

  private agruparProjetosEmColunas(): void {
    const estagiosPadrao = [
      { id: 1, titulo: 'Em Rascunho / Mapeamento', cor: '#dc2626', cards: [] as any[] }, 
      { id: 2, titulo: 'Homologação / Vídeos', cor: '#eab308', cards: [] as any[] },    
      { id: 3, titulo: 'Publicado / Ativo', cor: '#16a34a', cards: [] as any[] }     
    ];

    this.listaProjetos.forEach(projeto => {
      const estagioAlvo = projeto.estagioId ? Number(projeto.estagioId) : 1;
      const coluna = estagiosPadrao.find(c => c.id === estagioAlvo);

      if (coluna) {
        coluna.cards.push(projeto);
      } else {
        estagiosPadrao[0].cards.push(projeto);
      }
    });

    this.colunasKanbanAdmin = estagiosPadrao;
  }

  aoSoltarCardCurso(event: CdkDragDrop<any[]>, colunaIdAlvo: number): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const cursoMovido = event.container.data[event.currentIndex];
      const cardIdParaSalvar = cursoMovido.kanban_cards && cursoMovido.kanban_cards.length > 0
        ? Number(cursoMovido.kanban_cards[0].id)
        : Number(cursoMovido.id);


      this.kanbanService.atualizarEstagioCardAdmin(cardIdParaSalvar, colunaIdAlvo, event.currentIndex + 1).subscribe({
        next: (resposta) => {
          this.alerts.sucesso(`Estágio de "${cursoMovido.titulo}" atualizado com sucesso!`);
          cursoMovido.estagioId = colunaIdAlvo;
        },
        error: (err) => {
          console.error('Erro ao persistir movimento do card no banco:', err);
          this.alerts.erro('Falha ao salvar nova fase no servidor. Revertendo alteração...');
          this.carregarProjetosEEstrutura();
        }
      });
    }
  }
}
