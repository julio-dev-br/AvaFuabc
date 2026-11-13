import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { ProtheusService } from './protheus.service';

@Controller('integracao/protheus')
export class ProtheusMockController {
  constructor(private readonly protheusService: ProtheusService) {}

  @Get('empresas')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterEmpresasERP() {
    return [
      { id: '1000000000000001', nome: 'Fundação ABC - Central' },
      { id: '1000000000000002', nome: 'Hospital Mário Covas' },
      { id: '1000000000000003', nome: 'Complexo de Saúde de São Bernardo' }
    ];
  }

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

  @Get('cargos')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterCargosERP() {
    return [
      { id: '5000000000000001', nome: 'Enfermagem Geral' },
      { id: '5000000000000002', nome: 'Médico Residente' },
      { id: '5000000000000003', nome: 'Técnico em Radiologia (NR-32)' },
      { id: '5000000000000004', nome: 'Administrativo Hospitalar' }
    ];
  }

  @Get('departamentos')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async obterDepartamentosERP() {
    return [
      { id: '3000000000000001', nome: 'Bloco Cirúrgico & Anestesia' },
      { id: '3000000000000002', nome: 'CCIH & Controle de Infecção' },
      { id: '3000000000000003', nome: 'Pronto Atendimento & Triagem' },
      { id: '3000000000000004', nome: 'Farmácia Central Hospitalar' },
      { id: '3000000000000005', nome: 'Faturamento & Auditoria de Prontuários' }
    ];
  }

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

  @Get('validar-cpf/:cpf')
  @HttpCode(HttpStatus.OK)
  async buscarPorCpfPublico(@Param('cpf') cpf: string) {
    return this.protheusService.buscarColaboradorPorCpf(cpf);
  }
}
