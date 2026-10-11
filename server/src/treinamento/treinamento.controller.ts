import { Controller, Get, Post, Body, UseGuards, Param, Delete, Req } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TreinamentoService } from './treinamento.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';

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
  @Roles('admin', 'manager')
  async criarTreinamento(@Body() body: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }) {
    return this.treinamentosService.criar(body);
  }

  @Post('admin/modulos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async criarModulo(@Body() body: { treinamentoId: number; titulo: string; ordem: number }) {
    return this.treinamentosService.criarModulo(body);
  }

  @Post('admin/aulas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async criarAula(@Body() body: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }) {
    return this.treinamentosService.criarAula(body);
  }

  @Post('admin/vincular-publico')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async vincularPublico(@Body() body: { treinamentoId: number; tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO'; referenciaId: number }) {
    return this.treinamentosService.vincularPublico(body);
  }

  // 📊 CIRCUITO 1: Métricas resumidas do painel de controle principal
  @Get('admin/metricas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async obterMetricasAdmin() {
    return this.treinamentosService.obterMetricasPainel();
  }

  // 📈 CIRCUITO 2: Métricas profundas do BI (Gráficos de linhas, hospital e pizza)
  // 🚀 AJUSTADO: Rota estendida para evitar a colisão de endereços no NestJS!
  @Get('admin/metricas/analiticas')
  async obterMetricasAnaliticas() {
    return this.treinamentosService.obterMetricasAnaliticas();
  }


  @Get('gerencial')
  @Roles(Role.ADMIN, Role.MANAGER)
  async obterCatalogoGerencial() {
    return this.treinamentosService.listarTreinamentosGerencial();
  }

  @Get(':id')
  async obterConteudoCurso(@Param('id') id: string) {
    return this.treinamentosService.obterConteudoCurso(Number(id));
  }

  @Get('admin/projetos')
  async obterProjetosAdmin() {
    return this.treinamentosService.listarProjetosAdmin();
  }

  @Delete('admin/vincular-publico/:id')
  async removerVinculoPublico(@Param('id') id: string) {
    return this.treinamentosService.removerVinculoPublico(Number(id));
  }

  @Post('admin/publicar/:id')
  async publicarTreinamentoComKanban(@Param('id') id: string, @Req() req: any) {
    // Captura o ID do administrador direto do payload do JWT pelo AuthGuard
    const usuarioId = req.user.id;
    return this.treinamentosService.finalizarEPublicarTreinamento(Number(id), usuarioId);
  }

}
