import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { SignInDTO, SignUpDTO } from './dtos/auth';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

    constructor(
        private prismaService: PrismaService,
        private jwtService: JwtService,
    ) { }

    async signup(data: SignUpDTO) {
        if (!data.name || data.name.trim() === '') {
            throw new BadRequestException('O nome do colaborador é obrigatório.');
        }
        if (!data.email || !data.email.includes('@')) {
            throw new BadRequestException('O e-mail informado é inválido.');
        }
        if (!data.cpf || data.cpf.trim() === '') {
            throw new BadRequestException('O CPF é obrigatório para validação no Protheus.');
        }

        // Verifica se o e-mail já está em uso no portal
        const userAlreadyExists = await this.prismaService.user.findUnique({
            where: {
                email: data.email
            }
        });

        if (userAlreadyExists) {
            throw new UnauthorizedException('Este e-mail já está cadastrado no sistema.');
        }

        // INTEGRAÇÃO PROTHEUS MOCK SÍNCRONA: Varre o array em memória do ProtheusMockController
        const cpfLimpo = data.cpf.replace(/\D/g, '');
        
        const { MOCK_FUNCIONARIOS_PROTHEUS } = require('../integracao/protheus/protheus.controller');
        
        const funcionarioErp = MOCK_FUNCIONARIOS_PROTHEUS.find((f: any) => f.cpf === cpfLimpo);

        if (!funcionarioErp) {
            throw new UnauthorizedException('Atenção: CPF não localizado na folha de colaboradores ativos do Protheus da Fundação ABC. Procure o RH institucional.');
        }

        // Convertemos os IDs estáveis de 16 dígitos do ERP para BigInt
        const empresaId = funcionarioErp.empresa_id ? BigInt(funcionarioErp.empresa_id) : null;
        const unidadeId = funcionarioErp.unidade_id ? BigInt(funcionarioErp.unidade_id) : null;
        const deptoId = funcionarioErp.departamento_id ? BigInt(funcionarioErp.departamento_id) : null;
        const cargoId = funcionarioErp.cargo_id ? BigInt(funcionarioErp.cargo_id) : null;

        // CHECAGEM DE CPF DUPLICADO VIA ASSINATURA ORGANIZACIONAL
        if (unidadeId && cargoId) {
            const vinculoExiste = await this.prismaService.user.findFirst({
                where: {
                    unidade_id: unidadeId,
                    cargo_id: cargoId,
                    departamento_id: deptoId,
                    name: funcionarioErp.name
                }
            });

            if (vinculoExiste) {
                throw new UnauthorizedException(`Atenção: O colaborador ${funcionarioErp.name} já possui uma conta ativa registrada para este CPF.`);
            }
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // CARGA AUTOMÁTICA DE RH: Grava no Postgres herdando as filiais BigInt automáticas do Protheus
        const user = await this.prismaService.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name || '',
                role: 'user', 
                empresa_id: empresaId,
                unidade_id: unidadeId,
                departamento_id: deptoId,
                cargo_id: cargoId,
                ativo: true
            }
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
    }

    async signin(data: SignInDTO) {
        const user = await this.prismaService.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const passwordMatch = await bcrypt.compare(data.password, user.password);

        if (!passwordMatch) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const token = await this.jwtService.signAsync({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role, 
        });

        return {
            accessToken: token,
            role: user.role
        };
    }
}