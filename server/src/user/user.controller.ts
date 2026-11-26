import { Controller, Get, Param, Post, Patch, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ProtheusService } from '../integracao/protheus/protheus.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as bcrypt from 'bcrypt';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly protheusService: ProtheusService,
  ) { }

  @Get()
  @Roles(Role.MASTER, Role.ADMIN, Role.MANAGER)
  async findAll() {
    const usuarios = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });

    return usuarios.map(u => ({
      id: u.id,
      name: u.name || '—',
      email: u.email,
      cpf: u.cpf || '—',
      matricula: u.matricula || '—',
      role: u.role,
      ativo: u.ativo,
      unidade: {
        nome: u.empresa_nome || '—'
      },
      departamento: {
        nome: u.centro_custo_descricao || '—'
      },
      cargo: {
        nome: u.cargo_nome || '—'
      }
    }));
  }

  @Post()
  @Roles(Role.MASTER, Role.ADMIN)
  async create(@Body() body: CriarUsuarioInput, @CurrentUser() userLogado: any) {
    if (!body.name || body.name.trim() === '') {
      throw new BadRequestException('O nome do colaborador é obrigatório.');
    }
    if (!body.email || !body.email.includes('@')) {
      throw new BadRequestException('O e-mail informado é inválido.');
    }
    if (!body.cpf || body.cpf.trim() === '') {
      throw new BadRequestException('O CPF do colaborador é obrigatório para validação no Protheus.');
    }

    if (body.role === Role.MASTER && userLogado?.role !== Role.MASTER) {
      throw new BadRequestException('Apenas um usuário Master pode criar outro perfil Master.');
    }

    const cpfLimpo = body.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('O CPF informado deve conter 11 dígitos.');
    }

    const emailExiste = await this.prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
    });

    if (emailExiste) {
      throw new BadRequestException('Este e-mail já está cadastrado no sistema.');
    }

    const cpfExiste = await this.prisma.user.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (cpfExiste) {
      throw new BadRequestException('Este CPF já possui uma conta cadastrada no sistema.');
    }

    const funcionarioErp = await this.protheusService.buscarColaboradorPorCpf(cpfLimpo);

    const toBigIntSafe = (valor?: string | null): bigint | null => {
      if (!valor) return null;
      const apenasNumeros = String(valor).replace(/\D/g, '');
      return apenasNumeros ? BigInt(apenasNumeros) : null;
    };

    const empresaId = toBigIntSafe(funcionarioErp.empresa_id);
    const deptoId = toBigIntSafe(funcionarioErp.departamento_id);
    const cargoId = toBigIntSafe(funcionarioErp.cargo_id);

    const senhaPadrao = body.password?.trim() || 'Fuabc@2026';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senhaPadrao, salt);

    const novoUsuario = await this.prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name.trim() || funcionarioErp.nome,
        cpf: cpfLimpo,
        matricula: funcionarioErp.matricula || null,
        password: passwordHash,
        role: body.role || Role.USER,
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
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        matricula: true,
        empresa_nome: true,
        cargo_nome: true,
        centro_custo_descricao: true,
      }
    });

    return novoUsuario;
  }
  @Patch(':id/status')
  @Roles(Role.MASTER, Role.ADMIN)
  async mudarStatus(@Param('id') id: string, @CurrentUser() userLogado: any) {
    if (!id || isNaN(Number(id))) {
      throw new BadRequestException('ID inválido.');
    }

    const alvoId = Number(id);
    if (alvoId === Number(userLogado?.id)) {
      throw new BadRequestException('Por segurança, você não pode desativar seu próprio acesso.');
    }

    const usuario = await this.prisma.user.findUnique({ where: { id: alvoId } });
    if (!usuario) throw new BadRequestException('Usuário não localizado.');

    if (usuario.role === Role.MASTER && userLogado?.role !== Role.MASTER) {
      throw new BadRequestException('Apenas um usuário Master pode alterar o status de outro Master.');
    }

    if (usuario.ativo && (usuario.role === Role.ADMIN || usuario.role === Role.MASTER)) {
      const totalAdminsAtivos = await this.prisma.user.count({
        where: {
          ativo: true,
          role: { in: [Role.ADMIN, Role.MASTER] },
        },
      });

      if (totalAdminsAtivos <= 1) {
        throw new BadRequestException('Não é possível desativar o único administrador ativo do sistema.');
      }
    }

    return this.prisma.user.update({
      where: { id: alvoId },
      data: { ativo: !usuario.ativo },
      select: { id: true, name: true, ativo: true }
    });
  }

  @Patch(':id/role')
  @Roles(Role.MASTER, Role.ADMIN)
  async alterarPerfil(
    @Param('id') id: string,
    @Body('role') novoPerfil: Role,
    @CurrentUser() userLogado: any,
  ) {
    if (!id || isNaN(Number(id))) {
      throw new BadRequestException('ID inválido.');
    }

    const perfisValidos = Object.values(Role);
    if (!perfisValidos.includes(novoPerfil)) {
      throw new BadRequestException('Perfil de acesso inválido.');
    }

    const alvoId = Number(id);
    if (alvoId === Number(userLogado?.id)) {
      throw new BadRequestException('Por segurança, você não pode alterar o seu próprio perfil.');
    }

    const usuario = await this.prisma.user.findUnique({ where: { id: alvoId } });
    if (!usuario) throw new BadRequestException('Usuário não localizado.');

    if (usuario.role === Role.MASTER && userLogado?.role !== Role.MASTER) {
      throw new BadRequestException('Apenas um usuário Master pode alterar o perfil de outro Master.');
    }

    if (novoPerfil === Role.MASTER && userLogado?.role !== Role.MASTER) {
      throw new BadRequestException('Apenas um usuário Master pode promover alguém a Master.');
    }

    const estavaComoAdmin = usuario.role === Role.ADMIN || usuario.role === Role.MASTER;
    const vaiContinuarAdmin = novoPerfil === Role.ADMIN || novoPerfil === Role.MASTER;

    if (estavaComoAdmin && !vaiContinuarAdmin && usuario.ativo) {
      const totalAdminsAtivos = await this.prisma.user.count({
        where: {
          ativo: true,
          role: { in: [Role.ADMIN, Role.MASTER] },
        },
      });

      if (totalAdminsAtivos <= 1) {
        throw new BadRequestException('O sistema exige pelo menos um Administrador ou Master ativo.');
      }
    }

    return this.prisma.user.update({
      where: { id: alvoId },
      data: { role: novoPerfil },
      select: { id: true, name: true, role: true },
    });
  }

  @Patch('perfil/avatar')
  @Roles(Role.USER, Role.MANAGER, Role.ADMIN, Role.CONTEUDISTA, Role.CURADOR, Role.MASTER)
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
        const formatosPermitidos = ['image/jpeg', 'image/jpg', 'image/png'];

        if (!formatosPermitidos.includes(file.mimetype)) {
          return cb(new BadRequestException('Apenas arquivos JPG, JPEG ou PNG são permitidos!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');

    const appUrlEnv = process.env.APP_URL?.replace(/\/$/, '');
    const protocolo = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseUrl = appUrlEnv || `${protocolo}://${host}`;
    const linkPublico = `${baseUrl}/uploads/avatars/${file.filename}`;

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
  @Roles(Role.USER, Role.MANAGER, Role.ADMIN, Role.CONTEUDISTA, Role.CURADOR, Role.MASTER)
  async obterPerfilLogado(@CurrentUser() user: any) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!usuario) {
      throw new BadRequestException('Usuário não localizado no ecossistema.');
    }

    return {
      id: usuario.id,
      nome: usuario.name || '—',
      email: usuario.email,
      cpf: usuario.cpf || '—',
      matricula: usuario.matricula || '—',
      avatarUrl: usuario.avatar_url || 'assets/default-avatar.jpg',
      empresa: usuario.empresa_nome || '—',
      unidade: usuario.centro_custo_descricao || '—',
      cargo: usuario.cargo_nome || '—',
    };
  }

  @Patch('perfil/senha')
  @Roles(Role.USER, Role.MANAGER, Role.ADMIN, Role.CONTEUDISTA, Role.CURADOR, Role.MASTER)
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
