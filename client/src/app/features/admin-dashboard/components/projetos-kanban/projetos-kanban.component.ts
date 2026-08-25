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

  aoSoltarCardCurso(event: CdkDragDrop<any[]>, colunaIdAlvo: number): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // 1. Move visualmente no front-end para dar sensação de velocidade instantânea
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // 2. Captura o card e o ID do projeto que acabaram de ser soltos na nova coluna
      const cursoMovido = event.container.data[event.currentIndex];

      // 🌟 A VACINA: Verifica se o curso já tem um card associado na relação, senão usa o próprio id do curso como fallback de segurança
      const cardIdParaSalvar = cursoMovido.kanban_cards && cursoMovido.kanban_cards.length > 0
        ? Number(cursoMovido.kanban_cards[0].id)
        : Number(cursoMovido.id);

      // 3. Dispara a persistência de background no PostgreSQL via NestJS
      this.kanbanService.atualizarEstagioCardAdmin(cardIdParaSalvar, colunaIdAlvo, event.currentIndex + 1).subscribe({
        next: (resposta) => {
          this.alerts.sucesso(`Estágio de "${cursoMovido.titulo}" atualizado com sucesso! 🚀`);

          // 🌟 REATIVIDADE LOCAL: Sintoniza o ID do estágio no objeto para manter o estado íntegro na tela
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
