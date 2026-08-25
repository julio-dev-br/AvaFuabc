import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TreinamentoService } from './treinamento.service';

// Importações dos novos mecanismos de segurança
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';

@Controller('treinamentos')
@UseGuards(AuthGuard) // Regra global: precisa estar logado para qualquer rota aqui
export class TreinamentoController {
  constructor(private readonly treinamentosService: TreinamentoService) { }

  // 1. ROTA DO ALUNO: Buscar cursos liberados (Livre para qualquer Role logada)
  @Get('disponiveis')
  async getDisponiveis(@CurrentUser() user: any) {
    return this.treinamentosService.findAvailableForUser(user);
  }

  //  ROTA DA GAMIFICAÇÃO: GET /treinamentos/aluno/gamificacao
  @Get('aluno/gamificacao')
  async obterGamificacao(@CurrentUser() user: any) {
    return this.treinamentosService.obterDadosGamificacao(user.id);
  }

  // =========================================================================
  //  ROTAS ADMINISTRATIVAS: Protegidas por barreira dupla de cargo (Roles)
  // =========================================================================

  // 2. Cadastra um novo Treinamento Base: POST /treinamentos/admin/criar
  @Post('admin/criar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async criarTreinamento(@Body() body: { titulo: string; descricao?: string; carga_horaria: number; obrigatorio: boolean }) {
    return this.treinamentosService.criar(body);
  }

  // 3. Cadastra un Módulo dentro de um Treinamento: POST /treinamentos/admin/modulos
  @Post('admin/modulos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async criarModulo(@Body() body: { treinamentoId: number; titulo: string; ordem: number }) {
    return this.treinamentosService.criarModulo(body);
  }

  // 4. Cadastra uma Aula dentro de um Módulo: POST /treinamentos/admin/aulas
  @Post('admin/aulas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async criarAula(@Body() body: { moduloId: number; titulo: string; descricao?: string; videoUrl: string; ordem: number }) {

    // ✅ LIMPO E SEGURO: Sem marretas de texto duplicadas! 
    // Apenas repassa o pacote com a URL perfeita tratada pelo Angular direto para o serviço salvar
    return this.treinamentosService.criarAula(body);
  }

  // Adicione esta rota no bloco administrativo do seu TreinamentoController:
  @Post('admin/vincular-publico')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async vincularPublico(@Body() body: { treinamentoId: number; tipo: 'EMPRESA' | 'UNIDADE' | 'DEPARTAMENTO' | 'CARGO' | 'USUARIO'; referenciaId: number }) {
    return this.treinamentosService.vincularPublico(body);
  }

  //  NOVA ROTA DE BI: GET /treinamentos/admin/metricas
  @Get('admin/metricas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager') // Apenas gestores e admins conseguem ler os relatórios
  async obterMetricasAdmin() {
    return this.treinamentosService.obterMetricasPainel();
  }

  @Get('gerencial')
  @Roles(Role.ADMIN, Role.MANAGER) // Apenas administradores e gerentes acessam o catálogo gerencial
  async obterCatalogoGerencial() {
    return this.treinamentosService.listarTreinamentosGerencial();
  }

  @Get(':id')
  async obterConteudoCurso(@Param('id') id: string) {
    return this.treinamentosService.obterConteudoCurso(Number(id));
  }

  // 💼 ROTA DO GESTOR: GET /treinamentos/admin/projetos
  @Get('admin/projetos')
  async obterProjetosAdmin() {
    return this.treinamentosService.listarProjetosAdmin(); // Ajuste o nome conforme o seu construtor
  }


}
