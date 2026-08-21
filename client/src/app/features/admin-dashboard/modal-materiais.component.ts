import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select'; // 🌟 ADICIONADO
import { TreinamentoService } from '../../core/services/treinamento.service';

@Component({
  selector: 'app-modal-materiais',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatRadioModule, MatSelectModule
  ],
  template: `
    <div style="padding: 20px;">
      <h2 mat-dialog-title style="color: #003366; font-weight: bold; margin: 0 0 4px 0; font-size: 18px;">
        📂 Materiais de Apoio
      </h2>
      <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0;">
        Gerencie os arquivos complementares para: <strong>{{ data.titulo }}</strong>
      </p>

      <!-- 🌟 SELETOR DE AULAS CRUCIAL: Mapeia as aulas contidas nos módulos do curso -->
      <!-- 🌟 SELETOR DE AULAS CRUCIAL: Ajustado de mat-option-group para mat-optgroup -->
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
        <mat-label>Selecione a Aula Destino</mat-label>
        <mat-select [(ngModel)]="aulaIdSelecionada" (selectionChange)="carregarMateriaisDoAula()">
          <mat-optgroup *ngFor="let mod of cursoDetalhado?.modulos" [label]="mod.titulo">
            <mat-option *ngFor="let aula of mod.aulas" [value]="aula.id">
              🎥 Aula: {{ aula.titulo }}
            </mat-option>
          </mat-optgroup>
        </mat-select>
      </mat-form-field>


      <!-- LISTAGEM DE MATERIAIS JÁ EXISTENTES DA AULA SELECIONADA -->
      <div *ngIf="aulaIdSelecionada" style="max-height: 140px; overflow-y: auto; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px;">
        <div *ngFor="let mat of listaMateriais" 
             style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; font-weight: 500;">
            <mat-icon style="color: #003366;">description</mat-icon>
            <span style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ mat.nome }}</span>
          </div>
          <button mat-icon-button color="warn" (click)="excluirMaterial(mat.id)" style="width: 32px; height: 32px;">
            <mat-icon style="font-size: 18px;">delete</mat-icon>
          </button>
        </div>
        <p *ngIf="listaMateriais.length === 0" style="color: #94a3b8; font-size: 13px; text-align: center; margin: 16px 0;">
          Nenhum material anexado a esta aula específica.
        </p>
      </div>

      <div *ngIf="!aulaIdSelecionada" style="padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1; margin-bottom: 24px; font-size: 13px; font-weight: 500;">
        ⚠️ Selecione uma aula acima para visualizar e gerenciar os documentos.
      </div>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 20px;">

      <!-- FORMULÁRIO DE INCLUSÃO (SÓ LIBERA SE HOUVER AULA SELECIONADA) -->
      <fieldset [disabled]="!aulaIdSelecionada" style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;">
        <div style="margin-bottom: 4px;">
          <mat-radio-group [(ngModel)]="tipoEnvio" style="display: flex; gap: 16px;">
            <mat-radio-button value="link" color="primary">🔗 Link (SharePoint)</mat-radio-button>
            <mat-radio-button value="arquivo" color="primary">💻 Arquivo do PC</mat-radio-button>
          </mat-radio-group>
        </div>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Nome do Arquivo / Título</mat-label>
          <input matInput [(ngModel)]="novoMaterial.nome" placeholder="Ex: Manual Técnico PDF">
        </mat-form-field>

        <mat-form-field *ngIf="tipoEnvio === 'link'" appearance="outline" style="width: 100%;">
          <mat-label>URL do Documento</mat-label>
          <input matInput [(ngModel)]="novoMaterial.url" placeholder="Ex: https://sharepoint.com...">
          <mat-icon matPrefix style="color: #64748b; margin-right: 8px;">link</mat-icon>
        </mat-form-field>

        <div *ngIf="tipoEnvio === 'arquivo'" style="padding: 12px; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; background: #fafafa;">
          <input type="file" id="fileUpload" (change)="selecionarArquivoDoPC($event)" style="display: none;" accept=".pdf,.ppt,.pptx,.docx,.xlsx">
          <label for="fileUpload" mat-stroked-button style="cursor: pointer; border-color: #003366; color: #003366;">
            <mat-icon style="vertical-align: middle; margin-right: 4px;">upload_file</mat-icon> Escolher Arquivo do PC
          </label>
          <p *ngIf="arquivoSelecionado" style="margin: 8px 0 0 0; font-size: 12px; color: #2e7d32; font-weight: bold;">
            ✔️ {{ arquivoSelecionado.name }}
          </p>
        </div>

        <div mat-dialog-actions style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px;">
          <button mat-button (click)="fecharModal()" style="color: #64748b;">Cancelar</button>
          <button mat-raised-button style="background-color: #003366; color: #ffffff;" 
                  [disabled]="!novoMaterial.nome.trim() || (tipoEnvio === 'link' && !novoMaterial.url.trim()) || (tipoEnvio === 'arquivo' && !arquivoSelecionado)" 
                  (click)="salvarMaterial()">
            <mat-icon>add</mat-icon> Anexar Material
          </button>
        </div>
      </fieldset>
    </div>
  `
})
export class ModalMateriaisComponent implements OnInit {
  private treinamentoService = inject(TreinamentoService);
  private dialogRef = inject(MatDialogRef<ModalMateriaisComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { id: number; titulo: string }) { }

  cursoDetalhado: any = null;
  aulaIdSelecionada: number | null = null;
  listaMaterials: any[] = []; // Fallback seguro para o template ler
  tipoEnvio: 'link' | 'arquivo' = 'link';
  novoMaterial = { nome: '', url: '' };
  arquivoSelecionado: File | null = null;

  // Getter reativo para contornar qualquer variação de nome de variável no template
  get listaMateriais(): any[] {
    return this.listaMaterials;
  }
  set listaMateriais(val: any[]) {
    this.listaMaterials = val;
  }

  ngOnInit(): void {
    this.carregarEstruturaAulasCurso();
  }

  carregarEstruturaAulasCurso(): void {
    // 🌟 DE OURO: Busca o curso completo trazendo os módulos e os IDs das aulas de dentro dele!
    this.treinamentoService.obterConteudoCurso(this.data.id).subscribe({
      next: (dados) => {
        this.cursoDetalhado = dados;
        // Atalho reativo: se o curso só tiver uma única aula no total, já deixa ela pré-selecionada!
        if (dados?.modulos?.[0]?.aulas?.[0] && dados.modulos.length === 1 && dados.modulos[0].aulas.length === 1) {
          this.aulaIdSelecionada = dados.modulos[0].aulas[0].id;
          this.carregarMateriaisDoAula();
        }
      },
      error: (err) => console.error('Erro ao mapear estrutura de aulas do curso:', err)
    });
  }

  carregarMateriaisDoAula(): void {
    if (!this.aulaIdSelecionada) return;
    this.treinamentoService.obterMateriaisApoio(this.aulaIdSelecionada).subscribe({
      next: (dados) => this.listaMateriais = dados,
      error: (err) => console.error(err)
    });
  }

  selecionarArquivoDoPC(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.arquivoSelecionado = input.files[0];
      if (!this.novoMaterial.nome.trim()) {
        this.novoMaterial.nome = this.arquivoSelecionado.name;
      }
    }
  }

  salvarMaterial(): void {
    if (!this.aulaIdSelecionada) return;

    if (this.tipoEnvio === 'link') {
      const payload = {
        aulaId: Number(this.aulaIdSelecionada),
        nome: this.novoMaterial.nome.trim(),
        url: this.novoMaterial.url.trim()
      };
      this.treinamentoService.adicionarMaterialApoio(payload).subscribe({
        next: () => this.resetarFormulario(),
        error: (err) => console.error(err)
      });
    } else if (this.tipoEnvio === 'arquivo' && this.arquivoSelecionado) {
      const formData = new FormData();
      formData.append('aulaId', this.aulaIdSelecionada.toString());
      formData.append('nome', this.novoMaterial.nome.trim());
      formData.append('file', this.arquivoSelecionado);

      this.treinamentoService.uploadArquivoMaterialApoio(formData).subscribe({
        next: () => this.resetarFormulario(),
        error: (err) => console.error(err)
      });
    }
  }

  resetarFormulario(): void {
    this.novoMaterial = { nome: '', url: '' };
    this.arquivoSelecionado = null;
    this.carregarMateriaisDoAula();
  }

  excluirMaterial(id: number): void {
    this.treinamentoService.removerMaterialApoio(id).subscribe({
      next: () => this.carregarMateriaisDoAula(),
      error: (err) => console.error(err)
    });
  }

  fecharModal(): void {
    this.dialogRef.close();
  }
}
