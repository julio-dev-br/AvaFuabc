import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('integracao/protheus')
@UseGuards(AuthGuard) // Mantém o padrão ouro de segurança que você adotou
export class ProtheusMockController {

  // 🏢 SIMULAÇÃO: Retorna a lista de Empresas/Filiais cadastradas no ERP
  @Get('empresas')
  @HttpCode(HttpStatus.OK)
  async obterEmpresasERP() {
    return [
      { id: '1000000000000001', nome: 'Fundação ABC - Central' },
      { id: '1000000000000002', nome: 'Hospital Mário Covas' },
      { id: '1000000000000003', nome: 'Complexo de Saúde de São Bernardo' }
    ];
  }

  // 🏥 SIMULAÇÃO: Retorna as Unidades/Filiais filtradas pela empresa selecionada
  @Get('unidades')
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

  // 📋 SIMULAÇÃO: Retorna os Cargos ou Departamentos para refinar o Público-Alvo (Passo 5)
  @Get('cargos')
  @HttpCode(HttpStatus.OK)
  async obterCargosERP() {
    return [
      { id: '5000000000000001', nome: 'Enfermagem Geral' },
      { id: '5000000000000002', nome: 'Médico Residente' },
      { id: '5000000000000003', nome: 'Técnico em Radiologia (NR-32)' },
      { id: '5000000000000004', nome: 'Administrativo Hospitalar' }
    ];
  }
}
