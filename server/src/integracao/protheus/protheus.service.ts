import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProtheusEmployeeItem {
  companyCode: string;
  companyDescription: string;
  employeeRegistration: string;
  employeeName: string;
  functionCode: string;
  admissionDate: string;
  functionDescription: string;
  costCenter: string;
  costCenterDescription: string;
  mail: string;
}

@Injectable()
export class ProtheusService {
  private readonly logger = new Logger(ProtheusService.name);

  constructor(private readonly httpService: HttpService) {}

  async buscarColaboradorPorCpf(cpf: string) {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('O CPF informado deve conter exatamente 11 dígitos numéricos.');
    }

    try {
      const baseUrl =
        process.env.PROTHEUS_API_URL ||
        'https://fundacaodo170819.protheus.cloudtotvs.com.br:4050/app/poadmin/api/v1';
        
      const urlProtheus = `${baseUrl}/getEmployeeByCpf/${cpfLimpo}`;

      this.logger.log(`Consultando CPF no Protheus: ${urlProtheus}`);

      const { data } = await firstValueFrom(
        this.httpService.get<{ items: ProtheusEmployeeItem[] }>(urlProtheus, {
          // Descomente e ajuste caso a API do RH exija autenticação:
          // headers: { Authorization: `Bearer ${process.env.PROTHEUS_TOKEN}` },
        }),
      );

      if (!data || !data.items || data.items.length === 0) {
        throw new BadRequestException('CPF não localizado na base ativa de colaboradores do Protheus.');
      }

      const colaborador = data.items[0];

      return {
        cpf: cpfLimpo,
        matricula: colaborador.employeeRegistration,
        nome: this.formatarTitleCase(colaborador.employeeName),
        email: colaborador.mail ? colaborador.mail.toLowerCase().trim() : '',
        data_admissao: colaborador.admissionDate,
        empresa_id: colaborador.companyCode,
        empresa_nome: this.formatarTitleCase(colaborador.companyDescription),
        cargo_id: colaborador.functionCode,
        cargo_nome: this.formatarTitleCase(colaborador.functionDescription),
        departamento_id: colaborador.costCenter,
        departamento_nome: colaborador.costCenterDescription,
      };
      
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Falha na consulta ao Protheus para o CPF ${cpfLimpo}: ${error?.message || error}`,
        error?.response?.data || '',
      );
      
      throw new InternalServerErrorException(
        'Não foi possível consultar a base do RH no momento. Tente novamente em instantes.',
      );
    }
  }

  private formatarTitleCase(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
