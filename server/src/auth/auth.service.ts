import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { SignInDTO, SignUpDTO } from './dtos/auth';
import { PrismaService } from '../prisma/prisma.service';
import { ProtheusService } from '../integracao/protheus/protheus.service';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private protheusService: ProtheusService,
  ) {}

  async signup(data: SignUpDTO) {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('O nome do colaborador é obrigatório.');
    }
    if (!data.cpf || data.cpf.trim() === '') {
      throw new BadRequestException('O CPF é obrigatório para validação no Protheus.');
    }

    const cpfLimpo = data.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('O CPF informado deve conter 11 dígitos.');
    }

    const funcionarioErp = await this.protheusService.buscarColaboradorPorCpf(cpfLimpo);

    if (!funcionarioErp) {
      throw new BadRequestException('Não foi possível extrair os dados do colaborador no Protheus.');
    }

    const emailOficial = (funcionarioErp.email || data.email || '').trim().toLowerCase();

    if (!emailOficial || !emailOficial.includes('@')) {
      throw new BadRequestException('Colaborador sem e-mail válido cadastrado no Protheus. Procure o RH.');
    }

    const userAlreadyExists = await this.prismaService.user.findFirst({
      where: {
        OR: [
          { cpf: cpfLimpo },
          { email: emailOficial },
        ],
      },
    });

    if (userAlreadyExists) {
      if (userAlreadyExists.cpf === cpfLimpo) {
        throw new UnauthorizedException('Este CPF já possui uma conta ativa cadastrada no portal.');
      }
      throw new UnauthorizedException('O e-mail vinculado a este colaborador já está cadastrado no sistema.');
    }

    const toBigIntSafe = (valor?: string | null): bigint | null => {
      if (!valor) return null;
      const apenasNumeros = String(valor).replace(/\D/g, '');
      return apenasNumeros ? BigInt(apenasNumeros) : null;
    };

    const empresaId = toBigIntSafe(funcionarioErp.empresa_id);
    const deptoId = toBigIntSafe(funcionarioErp.departamento_id);
    const cargoId = toBigIntSafe(funcionarioErp.cargo_id);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        email: emailOficial,
        cpf: cpfLimpo,
        matricula: funcionarioErp.matricula || null,
        password: hashedPassword,
        name: funcionarioErp.nome || data.name.trim(),
        role: 'user',
        ativo: true,
        empresa_id: empresaId,
        unidade_id: empresaId,
        empresa_nome: funcionarioErp.empresa_nome || null,
        departamento_id: deptoId,
        centro_custo: funcionarioErp.departamento_id || null,
        centro_custo_descricao: funcionarioErp.departamento_nome || null,
        cargo_id: cargoId,
        cargo_nome: funcionarioErp.cargo_nome || null,
        sincronizado_em: new Date(),
      },
    });

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async signin(data: SignInDTO) {
    if (!data.cpf || !data.password) {
      throw new BadRequestException('Informe o CPF e a senha para acessar o portal.');
    }

    const cpfLimpo = data.cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        cpf: cpfLimpo,
      },
    });

    if (!user) {
      throw new UnauthorizedException('CPF ou senha inválidos.');
    }

    if (!user.ativo) {
      throw new UnauthorizedException('Seu acesso encontra-se inativo. Procure o RH.');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('CPF ou senha inválidos.');
    }

    const token = await this.jwtService.signAsync({
      id: Number(user.id),
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
    });

    return {
      accessToken: token,
      role: user.role,
    };
  }
}
