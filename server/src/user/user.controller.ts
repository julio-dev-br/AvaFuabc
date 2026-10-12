import { Controller, Get, Param, Post, Patch, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as bcrypt from 'bcrypt';

// Interface de entrada ajustada para receber o CPF de validação do Protheus
interface CriarUsuarioInput {
  name: string;
  email: string;
  cpf: string; 
  role: Role;
  password?: string;
}

@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
export class UserController {

  constructor(private readonly prisma: PrismaService) { }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll() {
    const usuarios = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });
    return usuarios.map(u => ({
      id: u.id,
      name: u.name || 'Usuário Sem Nome',
      email: u.email,
      role: u.role,
      ativo: u.ativo,
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
    if (!body.cpf || body.cpf.trim() === '') {
      throw new BadRequestException('O CPF do colaborador é obrigatório para validação no Protheus.');
    }

    // 🛡️ TRAVA 1: Verifica se o e-mail já está em uso no portal
    const usuarioExiste = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (usuarioExiste) {
      throw new BadRequestException('Este e-mail já está cadastrado no sistema.');
    }

    // 🚀 INTEGRAÇÃO PROTHEUS MOCK SÍNCRONA: Varre o array em memória exportado pelo ProtheusMockController
    const cpfLimpo = body.cpf.replace(/\D/g, '');

    const { MOCK_FUNCIONARIOS_PROTHEUS } = require('../integracao/protheus/protheus.controller');

    const funcionarioErp = MOCK_FUNCIONARIOS_PROTHEUS.find(f => f.cpf === cpfLimpo);

    if (!funcionarioErp) {
      throw new BadRequestException('Atenção: CPF não localizado na folha de colaboradores ativos do Protheus da Fundação ABC.');
    }

    // Convertemos os IDs do ERP para BigInt para rodar a checagem cruzada de segurança
    const empresaId = funcionarioErp.empresa_id ? BigInt(funcionarioErp.empresa_id) : null;
    const unidadeId = funcionarioErp.unidade_id ? BigInt(funcionarioErp.unidade_id) : null;
    const deptoId = funcionarioErp.departamento_id ? BigInt(funcionarioErp.departamento_id) : null;
    const cargoId = funcionarioErp.cargo_id ? BigInt(funcionarioErp.cargo_id) : null;

    // Como o schema do User não guarda a string 'cpf', barramos se o mesmo funcionário do ERP tentar criar outra conta
    if (unidadeId && cargoId) {
      const vinculoExiste = await this.prisma.user.findFirst({
        where: {
          unidade_id: unidadeId,
          cargo_id: cargoId,
          departamento_id: deptoId,
          name: funcionarioErp.nome
        }
      });

      if (vinculoExiste) {
        throw new BadRequestException(`Atenção: O colaborador ${funcionarioErp.nome} já possui uma conta ativa registrada para este CPF/Lotação.`);
      }
    }

    const senhaPadrao = body.password || 'Fuabc@2026';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senhaPadrao, salt);

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

    console.log('✅ VALIDADO NO MOCK PROTHEUS E GRAVADO NO POSTGRESQL COM VALIDAÇÃO DUPLA! ID:', novoUsuario.id);
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
  @Roles(Role.USER, Role.MANAGER, Role.ADMIN)
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
        // 🚀 CORRIGIDO: Validação direta por lista de strings (Inviolável e livre de quebras de Regex!)
        const formatosPermitidos = ['image/jpeg', 'image/jpg', 'image/png'];

        if (!formatosPermitidos.includes(file.mimetype)) {
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

    const usuarioAtualizado = await this.prisma.user.update({
      where: { id: user.id },
      data: { avatar_url: linkPublico },
      select: { id: true, name: true, email: true, avatar_url: true }
    });

    return { 
      message: 'Foto de perfil atualizada com sucesso no ecossistema!',
      avatar_url: usuarioAtualizado.avatar_url 
    };
  }


  @Get('perfil/me')
  // 🚀 LIBERADO: Alunos, Líderes e Admins podem puxar seus próprios dados sincronizados do JWT
  @Roles(Role.USER, Role.MANAGER, Role.ADMIN)
  async obterPerfilLogado(@CurrentUser() user: any) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!usuario) {
      throw new BadRequestException('Usuário não localizado no ecossistema.');
    }

    return {
      id: usuario.id,
      nome: usuario.name || 'Colaborador',
      email: usuario.email,
      avatarUrl: usuario.avatar_url || 'assets/default-avatar.jpg',
      empresa: usuario.empresa_id ? `Empresa ${usuario.empresa_id.toString()}` : 'Fundação ABC',
      unidade: usuario.unidade_id ? `Unidade ${usuario.unidade_id.toString()}` : 'Hospital Mário Covas',
      cargo: usuario.cargo_id ? `Cargo ${usuario.cargo_id.toString()}` : 'Colaborador'
    };
  }

  @Patch('perfil/senha')
  @Roles(Role.USER, Role.MANAGER, Role.ADMIN)
  async atualizarSenha(@CurrentUser() user: any, @Body() body: any) {
    const { senhaAtual, novaSenha } = body;

    if (!senhaAtual || !novaSenha) {
      throw new BadRequestException('A senha atual e a nova senha são obrigatórias.');
    }

    const usuarioDB = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!usuarioDB) throw new BadRequestException('Usuário não localizado.');

    const senhaValida = await bcrypt.compare(senhaAtual, usuarioDB.password);
    if (!senhaValida) {
      throw new BadRequestException('A senha atual informada está incorreta.');
    }

    if (novaSenha.length < 6) {
      throw new BadRequestException('A nova senha deve conter no mínimo 6 caracteres.');
    }

    const salt = await bcrypt.genSalt(10);
    const novoPasswordHash = await bcrypt.hash(novaSenha, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: novoPasswordHash }
    });

    return { message: 'Senha atualizada com sucesso no ecossistema!' };
  }
}
