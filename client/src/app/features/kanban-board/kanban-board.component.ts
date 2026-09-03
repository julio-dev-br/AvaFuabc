import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Angular CDK Drag and Drop
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';

import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';
import { KanbanService } from '../../core/services/kanban.service';
import { AlertsService } from '../../core/services/alerts.service';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.css'
})
export class KanbanBoardComponent implements OnInit {
  private kanbanService = inject(KanbanService);
  private alerts = inject(AlertsService);
  private dialog = inject(MatDialog)
  private router = inject(Router);

  colunas: any[] = [];
  isLoading = true;
  novoCardTitulo = '';
  novoCardDescricao = ''; 
  colunaIdSendoAdicionada: number | null = null;

  // CONTROLADORES DE EDIÇÃO EM TEMPO REAL PARA O CLICK INLINE
  cardIdSendoEditado: number | null = null;
  tituloEdicaoInput: string = '';
  descricaoEdicaoInput: string = '';

  ngOnInit(): void {
    this.carregarQuadro();
  }

  carregarQuadro(): void {
    this.isLoading = true;
    this.kanbanService.obterQuadro().subscribe({
      next: (dados) => {
        this.colunas = dados;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar quadro:', err);
        this.isLoading = false;
      }
    });
  }
  
  onCardDrop(event: CdkDragDrop<any[]>, colunaDestinoId: number): void {
    // Guarda o estado anterior para o caso de precisarmos dar Rollback se o banco falhar!
    const colunaOrigemId = Number(event.previousContainer.id.replace('cdk-drop-list-', ''));
    const indexOrigem = event.previousIndex;
    const indexDestino = event.currentIndex;

    const ehMesmaColuna = event.previousContainer === event.container;

    if (ehMesmaColuna) {
      // Se moveu dentro da mesma coluna
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Se moveu para outra coluna
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Pega o card movido e calcula a nova ordem matemática no Postgres
    const cardMovido = event.container.data[event.currentIndex];
    const novaOrdem = event.currentIndex + 1;

    // Dispara a rota PATCH para o NestJS via Prisma
    this.kanbanService.moverCard(cardMovido.id, colunaDestinoId, novaOrdem).subscribe({
      next: () => {
        // APENAS SE MUDOU DE COLUNA: Dispara o pop-up discreto de sucesso no topo direito
        if (!ehMesmaColuna) {
          this.alerts.sucesso('Posição da tarefa atualizada! 📋');
        }
      },
      error: (err) => {
        console.error('Erro ao atualizar posição do card no servidor:', err);
        this.alerts.erro('Não foi possível salvar a nova posição da tarefa.');

        // REATIVIDADE DE ROLLBACK: O banco falhou? Desfaz o movimento na tela na hora!
        if (ehMesmaColuna) {
          moveItemInArray(event.container.data, indexDestino, indexOrigem);
        } else {
          transferArrayItem(
            event.container.data,
            event.previousContainer.data,
            indexDestino,
            indexOrigem
          );
        }
      }
    });
  }

  adicionarCard(colunaId: number): void {
    if (!this.novoCardTitulo.trim()) return;
    const payload = {
      colunaId,
      titulo: this.novoCardTitulo.trim(),
      descricao: this.novoCardDescricao.trim() || undefined // Envia apenas se não estiver em branco
    };

    this.kanbanService.criarCard(payload).subscribe({
      next: (novoCard) => {
        const coluna = this.colunas.find(c => c.id === colunaId);
        if (coluna) {
          coluna.cards.push(novoCard); // Alimenta a grade reativamente
        }
        
        this.alerts.sucesso('Tarefa adicionada ao seu quadro!');

        this.novoCardTitulo = '';
        this.novoCardDescricao = ''; 
        this.colunaIdSendoAdicionada = null;
      },
      error: (err) => {
        console.error('Erro ao criar card no Postgres:', err);
        this.alerts.erro('Não foi possível salvar a nova tarefa.');
      }
    });
  }

  ativarEdicaoInline(card: any): void {
    this.cardIdSendoEditado = card.id;
    this.tituloEdicaoInput = card.titulo;
    this.descricaoEdicaoInput = card.descricao || '';
  }

  cancelarEdicaoInline(): void {
    this.cardIdSendoEditado = null;
    this.tituloEdicaoInput = '';
    this.descricaoEdicaoInput = '';
  }

  salvarEdicaoCardReal(cardId: number, colunaId: number): void {
    if (!this.tituloEdicaoInput.trim()) {
      this.alerts.erro('O título da tarefa não pode ficar vazio!');
      return;
    }
    const payload = {
      titulo: this.tituloEdicaoInput.trim(),
      descricao: this.descricaoEdicaoInput.trim()
    };
    this.kanbanService.atualizarCard(cardId, payload).subscribe({
      next: (cardAtualizado) => {
        const coluna = this.colunas.find(c => c.id === colunaId);
        if (coluna) {
          const cardIndex = coluna.cards.findIndex((c: any) => c.id === cardId);
          if (cardIndex !== -1) {
            coluna.cards[cardIndex] = cardAtualizado;
          }
        }
        this.alerts.sucesso('Tarefa atualizada com sucesso!');
        this.cancelarEdicaoInline();
      },
      error: (err) => {
        console.error('Erro ao atualizar card no Postgres:', err);
        this.alerts.erro('Não foi possível salvar as alterações no servidor.');
      }
    });
  }

  deletarCardReal(cardId: number, colunaId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: 'Excluir Tarefa',
        mensagem: 'Deseja realmente remover esta tarefa permanentemente do seu quadro de estudos? Esta ação não pode ser desfeita.'
      }
    });

    // Escuta o clique dos botões da modal de forma reativa
    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.executarExclusaoFisica(cardId, colunaId);
      }
    });
  }

  private executarExclusaoFisica(cardId: number, colunaId: number): void {
    this.kanbanService.excluirCard(cardId).subscribe({
      next: () => {
        const coluna = this.colunas.find(c => c.id === colunaId);
        if (coluna) {
          coluna.cards = coluna.cards.filter((c: any) => c.id !== cardId);
        }
        this.alerts.sucesso('Tarefa removida do seu quadro!'); // Seu pop-up verde lindo do topo direito!
      },
      error: (err) => {
        console.error('Erro ao excluir card no Postgres:', err);
        this.alerts.erro('Erro técnico ao tentar remover a tarefa do banco.');
      }
    });
  }

  mostrarInputNovoCard(colunaId: number): void {
    this.colunaIdSendoAdicionada = colunaId;
    this.novoCardTitulo = '';
  }

  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
} 
