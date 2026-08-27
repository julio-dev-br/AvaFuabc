import { Controller, Get, Post, Body, UseGuards, Patch, UseInterceptors, UploadedFile, BadRequestException, Param } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Importação da nossa Interface de Contrato
import * as bcrypt from 'bcrypt';
import type { CriarUsuarioInput } from './interfaces/criar-usuario.interface';

@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
export class UserController {

  constructor(private readonly prisma: PrismaService) { }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll() {
    // 📋 Traz a listagem crua do PostgreSQL sem travar na serialização do BigInt
    const usuarios = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });

    return usuarios.map(u => ({
      id: u.id,
      name: u.name || 'Usuário Sem Nome',
      email: u.email,
      role: u.role,
      ativo: u.ativo,
      // Fallbacks amigáveis para a tabela do Angular ler enquanto o ERP não preenche
      unidade: { nome: u.unidade_id ? `Unidade ${u.unidade_id.toString()}` : 'Aguardando Integração ERP' },
      departamento: { nome: u.departamento_id ? `Depto ${u.departamento_id.toString()}` : 'Geral / RH' },
      cargo: { nome: u.cargo_id ? `Cargo ${u.cargo_id.toString()}` : 'Colaborador' }
    }));
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() body: CriarUsuarioInput) {
    if (!body.name || body.name.trim() === '') {
      throw new BadRequestException('O nome do colaborador é obrigatório.');
    }
    if (!body.email || !body.email.includes('@')) {
      throw new BadRequestException('O e-mail informado é inválido.');
    }

    const usuarioExiste = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (usuarioExiste) {
      throw new BadRequestException('Este e-mail já está cadastrado no sistema.');
    }

    const senhaPadrao = body.password || 'Fuabc@2026';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senhaPadrao, salt);

    // 🌟 TRATAMENTO DE NULOS DO ERP: Se o campo vier em branco ou undefined, grava NULL com segurança
    const empresaId = body.empresa_id ? BigInt(body.empresa_id) : null;
    const unidadeId = body.unidade_id ? BigInt(body.unidade_id) : null;
    const deptoId = body.departamento_id ? BigInt(body.departamento_id) : null;
    const cargoId = body.cargo_id ? BigInt(body.cargo_id) : null;

    const novoUsuario = await this.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: passwordHash,
        role: body.role,
        ativo: true,
        empresa_id: empresaId,
        unidade_id: unidadeId,
        departamento_id: deptoId,
        cargo_id: cargoId,
      },
      select: { id: true, name: true, email: true }
    });

    console.log('✅ GRAVADO NO POSTGRESQL COM SUCESSO! ID:', novoUsuario.id);
    return novoUsuario;
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  async mudarStatus(@Param('id') id: string) {
    if (!id || isNaN(Number(id))) {
      throw new BadRequestException('ID inválido.');
    }

    const usuario = await this.prisma.user.findUnique({ where: { id: Number(id) } });
    if (!usuario) throw new BadRequestException('Usuário não localizado.');

    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { ativo: !usuario.ativo },
      select: { id: true, name: true, ativo: true }
    });
  }

  @Patch('perfil/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Apenas arquivos JPG, JPEG ou PNG são permitidos!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    const linkPublico = `http://localhost:3000/uploads/avatars/${file.filename}`;

    return this.prisma.user.update({
      where: { id: user.id },
      data: { avatar_url: linkPublico },
      select: { id: true, name: true, email: true, avatar_url: true }
    });
  }


  // 👤 1. BUSCA O PERFIL DO USUÁRIO LOGADO DIRETO DO POSTGRESQL VIA JWT
  @Get('perfil/me')
  async obterPerfilLogado(@CurrentUser() user: any) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!usuario) {
      throw new BadRequestException('Usuário não localizado no ecossistema.');
    }

    // Retorna o JSON higienizado lendo as colunas exatas do seu Schema Prisma!
    return {
      id: usuario.id,
      nome: usuario.name || 'Colaborador',
      email: usuario.email,
      avatarUrl: usuario.avatar_url || 'assets/default-avatar.png',
      // Mapeia os códigos de BigInt vindos do Protheus de forma amigável
      empresa: usuario.empresa_id ? `Empresa ${usuario.empresa_id.toString()}` : 'Fundação ABC',
      unidade: usuario.unidade_id ? `Unidade ${usuario.unidade_id.toString()}` : 'Hospital Mário Covas',
      cargo: usuario.cargo_id ? `Cargo ${usuario.cargo_id.toString()}` : 'Colaborador'
    };
  }

  // 🔒 2. ATUALIZA APENAS A SENHA CRIPTOGRAFADA DO ALUNO COM VALIDAÇÃO SEGURA
  @Patch('perfil/senha')
  async atualizarSenha(@CurrentUser() user: any, @Body() body: any) {
    const { senhaAtual, novaSenha } = body;

    if (!senhaAtual || !novaSenha) {
      throw new BadRequestException('A senha atual e a nova senha são obrigatórias.');
    }

    const usuarioDB = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!usuarioDB) throw new BadRequestException('Usuário não localizado.');

    // Valida se a senha atual digitada bate com o hash criptografado do banco
    const senhaValida = await bcrypt.compare(senhaAtual, usuarioDB.password);
    if (!senhaValida) {
      throw new BadRequestException('A senha atual informada está incorreta.');
    }

    if (novaSenha.length < 6) {
      throw new BadRequestException('A nova senha deve conter no mínimo 6 caracteres.');
    }

    // Gera o novo hash bcrypt com total segurança corporativa
    const salt = await bcrypt.genSalt(10);
    const novoPasswordHash = await bcrypt.hash(novaSenha, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: novoPasswordHash }
    });

    return { message: 'Senha atualizada com sucesso no ecossistema!' };
  }



}

