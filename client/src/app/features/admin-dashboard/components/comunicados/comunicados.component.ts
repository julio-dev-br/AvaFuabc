import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Module Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

// Serviços Globais do Core
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // 🚀 Adicionado suporte HTTP local para o Protheus
import { environment } from '../../../../../environments/environment';

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
  private http = inject(HttpClient); // 🚀 Injetado barramento HTTP para caçar as filiais do ERP

  // 📢 FORMULÁRIO REATIVO SINTONIZADO COM O TEMPLATE SAAS
  comunicadoForm = {
    escopo: 'GERAL' as 'GERAL' | 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO',
    referenciaId: null as string | null, // Alterado para string/null para suportar chaves BigInt com segurança
    titulo: '',
    mensagem: ''
  };
  isEnviandoComunicado = false;
  historicoComunicados = new MatTableDataSource<any>([]);
  colunasComunicados: string[] = ['data', 'titulo', 'mensagem'];

  @ViewChild('comunicadosPaginator') set content(paginator: MatPaginator) {
    if (paginator) {
      this.historicoComunicados.paginator = paginator;
    }
  }

  listaEmpresas: any[] = [];
  listaUnidades: any[] = [];
  listaDepartamentos: any[] = [];

  ngOnInit(): void {
    this.carregarHistoricoComunicados();
    this.carregarCombosDoProtheus();
  }

  private obterHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // CARGA DINÂMICA: Consome os dados reais do barramento do Protheus Mock
  carregarCombosDoProtheus(): void {
    // 1. Busca as empresas estruturais
    this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/empresas`, { headers: this.obterHeaders() }).subscribe({
      next: (dados) => this.listaEmpresas = dados,
      error: () => console.error('Falha ao carregar empresas do Protheus no combo.')
    });

    // 2. Busca as unidades físicas (Mário Covas, CHM Santo André legitimados do seed)
    this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/unidades`, { headers: this.obterHeaders() }).subscribe({
      next: (dados) => this.listaUnidades = dados,
      error: () => console.error('Falha ao carregar unidades organizacionais do Protheus.')
    });

    // 3. Busca a tabela de departamentos de saúde
    this.http.get<any[]>(`${environment.apiUrl}/integracao/protheus/departamentos`, { headers: this.obterHeaders() }).subscribe({
      next: (dados) => this.listaDepartamentos = dados,
      error: () => console.error('Falha ao carregar departamentos do Protheus.')
    });
  }

  carregarHistoricoComunicados(): void {
    this.notificationService.obterHistoricoAdmin().subscribe({
      next: (dados) => {
        this.historicoComunicados.data = dados;
      },
      error: () => {
        console.error('Erro ao buscar logs de auditoria de comunicados.');
      }
    });
  }

  aoMudarEscopo(): void {
    this.comunicadoForm.referenciaId = null;
  }

  dispararAlertaInstitucional(): void {
    if (!this.comunicadoForm.titulo.trim() || !this.comunicadoForm.mensagem.trim()) {
      this.alerts.erro('Por favor, preencha o título e a mensagem do comunicado.');
      return;
    }

    this.isEnviandoComunicado = true;

    const payload = {
      escopo: this.comunicadoForm.escopo,
      // Envia o BigInt como Number ou string de segurança para bater com o recebimento do NestJS
      referenciaId: this.comunicadoForm.escopo === 'GERAL' ? null : Number(this.comunicadoForm.referenciaId),
      titulo: this.comunicadoForm.titulo,
      mensagem: this.comunicadoForm.mensagem
    };

    console.log('=== DISPARANDO COMUNICADO EM MASSA VIA PROTHEUS CHAVES ===', payload);

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
