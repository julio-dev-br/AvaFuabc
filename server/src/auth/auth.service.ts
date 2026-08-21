import { Injectable, UnauthorizedException } from '@nestjs/common';
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
        const userAlreadyExists = await this.prismaService.user.findUnique({
            where: {
                email: data.email
            }
        });

        if (userAlreadyExists) {
            throw new UnauthorizedException('Usuário já existe');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Mapeamos os campos explicitamente para evitar nulos indesejados
        const user = await this.prismaService.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name || '', // Evita enviar undefined. Garante string vazia se não enviado.
                role: 'user', // Define explicitamente a role padrão ao criar
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

        // CORREÇÃO ESSENCIAL: Injetamos a role no payload do Token JWT 
        // para que o seu RolesGuard consiga ler depois!
        const token = await this.jwtService.signAsync({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role, // Adicionado aqui
        });

        return {
            accessToken: token,
            role: user.role
        };
    }

}
