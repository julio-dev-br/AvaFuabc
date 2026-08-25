import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

// Serviços
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertsService } from '../../../../core/services/alerts.service';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule
  ],
  templateUrl: './comunicados.component.html',
  styleUrl: './comunicados.component.css'
})
export class ComunicadosComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private alerts = inject(AlertsService);

  // 📢 FORMULÁRIO REATIVO
  comunicadoForm = {
    escopo: 'GERAL' as 'GERAL' | 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO',
    referenciaId: null as number | null,
    titulo: '',
    mensagem: ''
  };
  isEnviandoComunicado = false;

  // 📊 TABELA E AUDITORIA
  historicoComunicados = new MatTableDataSource<any>([]);
  colunasComunicados: string[] = ['data', 'titulo', 'mensagem'];
  
  @ViewChild('comunicadosPaginator') comunicadosPaginator!: MatPaginator;

  // Mocks Temporários do Protheus (Ajuste os caminhos se preferir centralizar)
  mockEmpresas = [ { id: 1, nome: 'Fundação ABC - Matriz' }, { id: 2, nome: 'Central de Convênios' } ];
  mockUnidades = [ { id: 10, nome: 'Hospital Mário Covas' }, { id: 11, nome: 'CHM Santo André' } ];
  mockDepartamentos = [ { id: 100, nome: 'Enfermagem' }, { id: 101, nome: 'Recursos Humanos' } ];

  ngOnInit(): void {
    this.carregarHistoricoComunicados();
  }

  carregarHistoricoComunicados(): void {
    this.notificationService.obterHistoricoAdmin().subscribe({
      next: (dados) => {
        this.historicoComunicados.data = dados;
        setTimeout(() => {
          this.historicoComunicados.paginator = this.comunicadosPaginator;
        });
      }
    });
  }

  dispararAlertaInstitucional(): void {
    if (!this.comunicadoForm.titulo.trim() || !this.comunicadoForm.mensagem.trim()) {
      this.alerts.erro('Por favor, preencha o título e a mensagem do comunicado.');
      return;
    }

    this.isEnviandoComunicado = true;

    const payload = {
      escopo: this.comunicadoForm.escopo,
      referenciaId: this.comunicadoForm.escopo === 'GERAL' ? null : Number(this.comunicadoForm.referenciaId),
      titulo: this.comunicadoForm.titulo,
      mensagem: this.comunicadoForm.mensagem
    };

    this.notificationService.dispararComunicadoAdmin(payload).subscribe({
      next: (res) => {
        this.alerts.sucesso(res.mensagem || 'Comunicado institucional disparado com sucesso!');
        this.carregarHistoricoComunicados();
        this.comunicadoForm.titulo = '';
        this.comunicadoForm.mensagem = '';
        this.comunicadoForm.referenciaId = null;
        this.isEnviandoComunicado = false;
      },
      error: () => {
        this.alerts.erro('Falha ao processar o envio em massa.');
        this.isEnviandoComunicado = false;
      }
    });
  }
}
