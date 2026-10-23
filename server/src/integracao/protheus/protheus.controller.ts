import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards, Param, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';

// CENTRAL DE FUNCIONÁRIOS MOCKADOS: Vincula CPFs reais às chaves de 16 dígitos declaradas no ERP
export const MOCK_FUNCIONARIOS_PROTHEUS = [
  {
    cpf: '12345678901',
    nome: 'Julio Valente',
    empresa_id: '1000000000000002',      // Hospital Mário Covas
    unidade_id: '2000000000000001',      // Pronto Socorro Adulto
    cargo_id: '5000000000000003',        // Técnico em Radiologia (NR-32)
    departamento_id: '3000000000000003'  // Pronto Atendimento & Triagem
  },
  {
    cpf: '98765432100',
    nome: 'Ana Silva',
    empresa_id: '1000000000000002',      // Hospital Mário Covas
    unidade_id: '2000000000000002',      // Ala de Internação - UTI
    cargo_id: '5000000000000001',        // Enfermagem Geral
    departamento_id: '3000000000000002'  // CCIH & Controle de Infecção
  },
  // Médico Residente lotado na UTI do Mário Covas
  {
    cpf: '11111111111',
    nome: 'Dr. Carlos Souza',
    empresa_id: '1000000000000002',      // Hospital Mário Covas
    unidade_id: '2000000000000002',      // Ala de Internação - UTI
    cargo_id: '5000000000000002',        // Médico Residente
    departamento_id: '3000000000000001'  // Bloco Cirúrgico & Anestesia
  },
  // Administrativo no faturamento da Matriz/Central
  {
    cpf: '22222222222',
    nome: 'Roberto Alves',
    empresa_id: '1000000000000001',      // Fundação ABC - Central
    unidade_id: '2000000000000099',      // Ambulatório Geral
    cargo_id: '5000000000000004',        // Administrativo Hospitalar
    departamento_id: '3000000000000005'  // Faturamento & Auditoria de Prontuários
  },
  // Farmacêutica no Complexo de São Bernardo
  {
    cpf: '33333333333',
    nome: 'Mariana Costa',
    empresa_id: '1000000000000003',      // Complexo de Saúde de São Bernardo
    unidade_id: '2000000000000099',      // Ambulatório Geral
    cargo_id: '5000000000000004',        // Administrativo Hospitalar
    departamento_id: '3000000000000004'  // Farmácia Central Hospitalar
  },
  // Enfermeiro Geral no Pronto Socorro do Mário Covas
  {
    cpf: '44444444444',
    nome: 'Fernanda Lima',
    empresa_id: '1000000000000002',      // Hospital Mário Covas
    unidade_id: '2000000000000001',      // Pronto Socorro Adulto
    cargo_id: '5000000000000001',        // Enfermagem Geral
    departamento_id: '3000000000000003'  // Pronto Atendimento & Triagem
  },
  // 🛡️ LIDERANÇA NOVA 1: Diretor Geral de Unidade Hospitalar
  {
    cpf: '55555555555',
    nome: 'Dr. Ricardo Alencar',
    empresa_id: '1000000000000002',      // Hospital Mário Covas
    unidade_id: '2000000000000002',      // Ala de Internação - UTI
    cargo_id: '5000000000000005',        // Diretor de Unidade Hospitalar
    departamento_id: '3000000000000007'  // UTI Neonatal & Pediatria
  },
  // 👥 LIDERANÇA NOVA 2: Gerente de RH na Central de Convênios
  {
    cpf: '66666666666',
    nome: 'Vanessa Oliveira',
    empresa_id: '1000000000000004',      // Central de Convênios - FUABC
    unidade_id: '2000000000000099',      // Ambulatório Geral
    cargo_id: '5000000000000006',        // Gerente de Departamento / RH
    departamento_id: '3000000000000006'  // Recursos Humanos & DHO
  }
];


@Controller('integracao/protheus')
export class ProtheusMockController {

  // Retorna a lista de Empresas/Filiais cadastradas no ERP
  @Get('empresas')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterEmpresasERP() {
    return [
      { id: '1000000000000001', nome: 'Fundação ABC - Central' },
      { id: '1000000000000002', nome: 'Hospital Mário Covas' },
      { id: '1000000000000003', nome: 'Complexo de Saúde de São Bernardo' },
      { id: '1000000000000004', nome: 'Central de Convênios - FUABC' } 
    ];
  }

  // Retorna as Unidades/Filiais filtradas pela empresa selecionada
  @Get('unidades')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterUnidadesERP(@Query('empresaId') empresaId: string) {
    if (empresaId === '1000000000000002') {
      return [
        { id: '2000000000000001', nome: 'Pronto Socorro Adulto' },
        { id: '2000000000000002', nome: 'Ala de Internação - UTI' }
      ];
    }
    return [
      { id: '2000000000000099', nome: 'Ambulatório Geral' }
    ];
  }

  // Retorna os Cargos ou Funções regulamentares do ERP
  @Get('cargos')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterCargosERP() {
    return [
      { id: '5000000000000001', nome: 'Enfermagem Geral' },
      { id: '5000000000000002', nome: 'Médico Residente' },
      { id: '5000000000000003', nome: 'Técnico em Radiologia (NR-32)' },
      { id: '5000000000000004', nome: 'Administrativo Hospitalar' },
      { id: '5000000000000005', nome: 'Diretor de Unidade Hospitalar' }, 
      { id: '5000000000000006', nome: 'Gerente de Departamento / RH' }   
    ];
  }

  // Retorna os Setores/Departamentos regulamentares do Protheus de RH
  @Get('departamentos')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterDepartamentosERP() {
    return [
      { id: '3000000000000001', nome: '🧪 Bloco Cirúrgico & Anestesia' },
      { id: '3000000000000002', nome: '🧪 CCIH & Controle de Infecção' },
      { id: '3000000000000003', nome: '🚨 Pronto Atendimento & Triagem' },
      { id: '3000000000000004', nome: '💊 Farmácia Central Hospitalar' },
      { id: '3000000000000005', nome: '💼 faturamento & Auditoria de Prontuários' },
      { id: '3000000000000006', nome: '👥 Recursos Humanos & DHO' },       // 🚀 Adicionado Setor
      { id: '3000000000000007', nome: '🏥 UTI Neonatal & Pediatria' }       // 🚀 Adicionado Setor
    ];
  }

  // Retorna os funcionários reais da base para a matrícula avulsa
  @Get('funcionarios')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterFuncionariosAvulsos() {
    return [
      { id: '1', nome: 'Julio Valente (Mtr: 1234)' },
      { id: '2', nome: 'Ana Silva (Mtr: 5566) - Seed' },
      { id: '3', nome: 'Carlos Souza (Mtr: 7788) - Seed' },
      { id: '4', nome: 'Roberto Alves (Mtr: 9900) - Seed' }
    ];
  }

  // 🚀 ENDPOINT DE AUDITORIA: Permite verificar cpfs isolados se necessário
  @Get('validar-cpf/:cpf')
  @HttpCode(HttpStatus.OK)
  async buscarPorCpfPublico(@Param('cpf') cpf: string) {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const funcionario = MOCK_FUNCIONARIOS_PROTHEUS.find(f => f.cpf === cpfLimpo);
    if (!funcionario) throw new BadRequestException('CPF não localizado na folha do Protheus.');
    return funcionario;
  }
}
