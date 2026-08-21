import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 🚀 INICIANDO ENGENHARIA DE SEED DO POSTGRESQL ===');

  // 1. LIMPEZA SEGURA DO BANCO (Evita duplicidade em loops de boot)
  await prisma.matricula.deleteMany({});
  await prisma.treinamento.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. CRIAÇÃO DO USUÁRIO DE TESTES (Carimbando sua matrícula e IDs organizacionais)
  const passwordHash = await bcrypt.hash('123456', 10);
  const usuarioAluno = await prisma.user.create({
    data: {
      id: 1,
      name: 'Julio Valente',
      email: 'julio@fuabc.org.br',
      password: passwordHash,
      role: 'admin',
      matricula: '123456',
      empresa_id: 1n,       // BigInt representativo para o Protheus
      unidade_id: 10n,
      departamento_id: 100n,
      cargo_id: 50n,
      ativo: true,
    },
  });

  console.log(`✔️ Usuário base criado com sucesso: ${usuarioAluno.email}`);

  // 3. CATALOGO DE 11 TREINAMENTOS FAKES COM REGRAS E NOTAS REAIS DE RH
  const dadosTreinamentosfakes = [
    { titulo: 'NR-32: Segurança na Saúde', progresso: 100, nota: 9.5, status: 'CONCLUIDO' },
    { titulo: 'Compliance e Lei Geral de Proteção de Dados (LGPD)', progresso: 100, nota: 8.0, status: 'CONCLUIDO' },
    { titulo: 'Prevenção e Controle de Infecção Hospitalar (SCIH)', progresso: 100, nota: 7.0, status: 'CONCLUIDO' },
    { titulo: 'NR-10: Segurança em Instalações Elétricas', progresso: 100, nota: 10.0, status: 'CONCLUIDO' },
    { titulo: 'Protocolo de Sepse e Atendimento Crítico', progresso: 100, nota: 8.5, status: 'CONCLUIDO' },
    { titulo: 'Treinamento de Integração Institucional FUABC', progresso: 100, nota: 7.5, status: 'CONCLUIDO' },
    { titulo: 'Humanização no Atendimento Hospitalar', progresso: 100, nota: 9.0, status: 'CONCLUIDO' },
    // 🚨 CURSOS ABAIXO DA MÉM_VALOR (7.0) OU INCOMPLETOS PARA TESTAR FILTROS DE HISTÓRICO
    { titulo: 'NR-05: CIPA e Prevenção de Acidentes', progresso: 100, nota: 5.5, status: 'REPROVADO' },
    { titulo: 'Prontuário Eletrônico e Registro de Enfermagem', progresso: 45, nota: null, status: 'EM_ANDAMENTO' },
    { titulo: 'Gestão de Resíduos Serviços de Saúde (PGRSS)', progresso: 100, nota: 6.0, status: 'REPROVADO' },
    { titulo: 'Liderança e Gestão de Equipes Médicas', progresso: 12, nota: null, status: 'EM_ANDAMENTO' }
  ];

  for (let i = 0; i < dadosTreinamentosfakes.length; i++) {
    const item = dadosTreinamentosfakes[i];

    // Grava o treinamento base
    const curso = await prisma.treinamento.create({
      data: {
        titulo: item.titulo,
        descricao: `Curso regulamentar de atualização de competências para a Fundação ABC.`,
        carga_horaria: 8,
        obrigatorio: true,
        ativo: true,
        certificado: true,
      },
    });

    // Vincula a matrícula diretamente ao usuário Julio (ID: 1)
    await prisma.matricula.create({
      data: {
        usuario_id: usuarioAluno.id,
        treinamento_id: curso.id,
        progresso: item.progresso,
        status: item.status,
        nota: item.nota,
        iniciado_em: new Date(),
        concluido_em: item.status === 'CONCLUIDO' || item.status === 'REPROVADO' ? new Date() : null,
      },
    });
  }

  console.log(`✔️ Catálogo de ${dadosTreinamentosfakes.length} históricos acadêmicos gerado no PostgreSQL!`);
  console.log('=== 🎉 ENGENHARIA DE SEED FINALIZADA COM SUCESSO COBRINDO A PAGINAÇÃO ===');
}

main()
  .catch((e) => {
    console.error('❌ Ocorreu um erro crítico durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
