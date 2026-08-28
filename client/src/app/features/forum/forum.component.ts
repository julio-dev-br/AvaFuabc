import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ForumService } from '../../core/services/forum.service';

@Component({
  selector: 'app-forum',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatToolbarModule,
    MatListModule,
    MatProgressBarModule
  ],
  templateUrl: './forum.component.html',
  styleUrl: './forum.component.css'
})
export class ForumComponent implements OnInit {
  private forumService = inject(ForumService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  aulaId!: number;
  topicos: any[] = [];
  topicoAtivo: any = null; // Guarda o tópico aberto com suas respostas
  isLoading = true;

  // Modelos para os formulários de entrada
  novoTitulo = '';
  novoConteudo = '';
  novaResposta = '';
  exibindoFormularioCriacao = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.aulaId = Number(idParam);
      this.carregarTopicos();
    }
  }

  carregarTopicos(): void {
    this.isLoading = true;
    this.forumService.listarTopicosPorAula(this.aulaId).subscribe({
      next: (dados) => {
        this.topicos = dados;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao carregar tópicos do fórum:', err);
        this.isLoading = false;
      }
    });
  }

  abrirTopico(topicoId: number): void {
    this.forumService.obterDetalhesTopico(topicoId).subscribe({
      next: (dados) => {
        this.topicoAtivo = dados;
        this.exibindoFormularioCriacao = false;
      },
      error: (err: HttpErrorResponse) => console.error('Erro ao abrir discussão:', err)
    });
  }

  publicarDuvida(): void {
    if (!this.novoTitulo.trim() || !this.novoConteudo.trim()) return;

    const payload = {
      aulaId: this.aulaId,
      titulo: this.novoTitulo,
      conteudo: this.novoConteudo
    };

    this.forumService.criarTopico(payload).subscribe({
      next: () => {
        this.novoTitulo = '';
        this.novoConteudo = '';
        this.exibindoFormularioCriacao = false;
        this.carregarTopicos(); // Atualiza a lista geral de perguntas
      }
    });
  }

  enviarResposta(): void {
    if (!this.novaResposta.trim() || !this.topicoAtivo) return;

    this.forumService.responderTopico(this.topicoAtivo.id, this.novaResposta).subscribe({
      next: () => {
        this.novaResposta = '';
        this.abrirTopico(this.topicoAtivo.id); // Recarrega a conversa atualizada
      }
    });
  }

  voltarParaCurso(): void {
    this.router.navigate(['/dashboard']); // Redireciona com segurança
  }
}
