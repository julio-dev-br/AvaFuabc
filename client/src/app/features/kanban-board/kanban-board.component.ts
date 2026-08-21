import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KanbanService } from '../../core/services/kanban.service';

// Angular CDK Drag and Drop
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';

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
    MatToolbarModule
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.css'
})
export class KanbanBoardComponent implements OnInit {
  private kanbanService = inject(KanbanService);
  private router = inject(Router);

  colunas: any[] = [];
  isLoading = true;
  novoCardTitulo = '';
  colunaIdSendoAdicionada: number | null = null;

  ngOnInit(): void {
    this.carregarQuadro();
  }

  carregarQuadro(): void {
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

  // Método mágico do Angular CDK executado ao soltar um cartão
  onCardDrop(event: CdkDragDrop<any[]>, colunaDestinoId: number): void {
    if (event.previousContainer === event.container) {
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

    // Pega o card movido e atualiza a nova posição no NestJS
    const cardMovido = event.container.data[event.currentIndex];
    const novaOrdem = event.currentIndex + 1;

    this.kanbanService.moverCard(cardMovido.id, colunaDestinoId, novaOrdem).subscribe({
      error: (err) => console.error('Erro ao atualizar posição do card no servidor:', err)
    });
  }

  mostrarInputNovoCard(colunaId: number): void {
    this.colunaIdSendoAdicionada = colunaId;
  }

  adicionarCard(colunaId: number): void {
    if (!this.novoCardTitulo.trim()) return;

    this.kanbanService.criarCard({ colunaId, titulo: this.novoCardTitulo }).subscribe({
      next: (novoCard) => {
        const coluna = this.colunas.find(c => c.id === colunaId);
        if (coluna) {
          coluna.cards.push(novoCard);
        }
        this.novoCardTitulo = '';
        this.colunaIdSendoAdicionada = null;
      }
    });
  }

  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
