import { Controller, Get, Post, Body, UseGuards, Param, Delete, Req } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TreinamentoService } from './treinamento.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('treinamentos')
@UseGuards(AuthGuard)
export class TreinamentoController {
  constructor(private readonly treinamentosService: TreinamentoService) { }

  @Get('disponiveis')
  async getDisponiveis(@CurrentUser() user: any) {
    return this.treinamentosService.findAvailableForUser(user);
  }

  @Get('aluno/gamificacao')
  async obterGamificacao(@CurrentUser() user: any) {
    return this.treinamentosService.obterDadosGamificacao(user.id);
  }

  @Post('admin/criar')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN)
  async criarTreinamento(@Body() body: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }) {
    return this.treinamentosService.criar(body);
  }

  @Post('admin/modulos')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN)
  async criarModulo(@Body() body: { treinamentoId: number; titulo: string; ordem: number }) {
    return this.treinamentosService.criarModulo(body);
  }

  @Post('admin/aulas')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN)
  async criarAula(@Body() body: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }) {
    return this.treinamentosService.criarAula(body);
  }

  @Post('admin/vincular-publico')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN)
  async vincularPublico(@Body() body: { treinamentoId: number; tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO'; referenciaId: number }) {
    return this.treinamentosService.vincularPublico(body);
  }

  @Get('admin/metricas')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN, Role.MANAGER)
  async obterMetricasAdmin() {
    return this.treinamentosService.obterMetricasPainel();
  }

  @Get('admin/metricas/analiticas')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN, Role.MANAGER)
  async obterMetricasAnaliticas() {
    return this.treinamentosService.obterMetricasAnaliticas();
  }

  @Get('gerencial')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN, Role.MANAGER)
  async obterCatalogoGerencial() {
    return this.treinamentosService.listarTreinamentosGerencial();
  }

  @Get('admin/projetos')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN, Role.MANAGER)
  async obterProjetosAdmin() {
    return this.treinamentosService.listarProjetosAdmin();
  }

  @Get(':id')
  async obterConteudoCurso(@Param('id') id: string, @CurrentUser() user: any) {
    return this.treinamentosService.obterConteudoCurso(Number(id), Number(user?.id));
  }

  @Delete('admin/vincular-publico/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN)
  async removerVinculoPublico(@Param('id') id: string) {
    return this.treinamentosService.removerVinculoPublico(Number(id));
  }

  @Post('admin/enviar-revisao/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR, Role.CONTEUDISTA, Role.ADMIN)
  async enviarTreinamentoParaRevisao(@Param('id') id: string, @Req() req: any) {
    return this.treinamentosService.enviarParaCuradoria(Number(id), Number(req.user.id));
  }

  @Post('admin/publicar/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.CURADOR)
  async publicarTreinamentoComKanban(@Param('id') id: string, @Req() req: any) {
    const usuarioId = req.user.id;
    return this.treinamentosService.finalizarEPublicarTreinamento(Number(id), usuarioId);
  }
}
