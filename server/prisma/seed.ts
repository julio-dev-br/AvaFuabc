import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 🚀 INICIANDO ENGENHARIA DE SEED DO POSTGRESQL ===');

  // 1. LIMPEZA SEGURA DO BANCO (Evita duplicidade e violações de chaves estrangeiras)
  await prisma.quizResponse.deleteMany({}); 
  await prisma.matricula.deleteMany({});
  await prisma.kanbanCard.deleteMany({});    
  await prisma.kanbanColuna.deleteMany({});  
  await prisma.treinamento.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('123456', 10);

  // 2. CRIAÇÃO DO SEU USUÁRIO BASE (ID: 1 - ADMINISTRADOR GESTOR)
  const usuarioJulio = await prisma.user.create({
    data: {
      id: 1,
      name: 'Julio Valente',
      email: 'julio@fuabc.org.br',
      password: passwordHash,
      role: 'admin',
      matricula: '123456',
      // 🛡️ VACINA DE BIGINT: IDs sincronizados perfeitamente com o ProtheusMockController!
      empresa_id: BigInt('1000000000000002'),       // Hospital Mário Covas
      unidade_id: BigInt('2000000000000001'),       // Pronto Socorro Adulto
      cargo_id: BigInt('5000000000000003'),         // Técnico em Radiologia (NR-32)
      departamento_id: BigInt('100'),               // Enfermagem
      ativo: true,
    },
  });
  console.log(`✔️ Usuário gestor criado com sucesso: ${usuarioJulio.email}`);

  // 📊 3. INJEÇÃO EXCLUSIVA DAS COLUNAS DO KANBAN DO ALUNO (Vinculadas legitimamente ao Julio)
  console.log('📊 Injetando as colunas estruturais do Kanban...');
  await prisma.kanbanColuna.create({
    data: { id: 1, usuario_id: usuarioJulio.id, titulo: '📌 A Fazer', ordem: 1, cor: '#cbd5e1' }
  });
  await prisma.kanbanColuna.create({
    data: { id: 2, usuario_id: usuarioJulio.id, titulo: '📖 Estudando', ordem: 2, cor: '#3b82f6' }
  });
  await prisma.kanbanColuna.create({
    data: { id: 3, usuario_id: usuarioJulio.id, titulo: '✅ Concluído', ordem: 3, cor: '#10b981' }
  });
  console.log('✔️ Colunas "A Fazer", "Estudando" e "Concluído" assentadas com sucesso!');

  // 👥 4. CRIAÇÃO DE ALUNOS ADICIONAIS PARA HOMOLOGAR AS MATRÍCULAS EM LOTE DO RH
  const usuarioAna = await prisma.user.create({
    data: {
      id: 2,
      name: 'Ana Souza (Enfermagem)',
      email: 'ana.enfermagem@fuabc.org.br',
      password: passwordHash,
      role: 'user',
      matricula: '654321',
      empresa_id: BigInt('1000000000000002'),       // Hospital Mário Covas
      unidade_id: BigInt('2000000000000002'),       // Ala de Internação - UTI
      cargo_id: BigInt('5000000000000001'),         // Enfermagem Geral
      departamento_id: BigInt('100'),
      ativo: true,
    },
  });

  const usuarioCarlos = await prisma.user.create({
    data: {
      id: 3,
      name: 'Dr. Carlos Melo (Médico)',
      email: 'carlos.med@fuabc.org.br',
      password: passwordHash,
      role: 'user',
      matricula: '987654',
      empresa_id: BigInt('1000000000000002'),       // Hospital Mário Covas
      unidade_id: BigInt('2000000000000001'),       // Pronto Socorro Adulto
      cargo_id: BigInt('5000000000000002'),         // Médico Residente
      departamento_id: BigInt('101'),
      ativo: true,
    },
  });

  const usuarioRoberto = await prisma.user.create({
    data: {
      id: 4,
      name: 'Roberto Silva (Radiologia)',
      email: 'roberto.rad@fuabc.org.br',
      password: passwordHash,
      role: 'user',
      matricula: '456789',
      empresa_id: BigInt('1000000000000003'),       // Complexo de Saúde SBC
      unidade_id: BigInt('2000000000000099'),       // Ambulatório Geral
      cargo_id: BigInt('5000000000000003'),         // Técnico em Radiologia (NR-32)
      departamento_id: BigInt('100'),
      ativo: true,
    },
  });
  console.log('✔️ Massa adicional de 3 alunos injetada com sucesso para testes do RH!');
  // 5. CATÁLOGO REGULAMENTAR DE TREINAMENTOS COM REGRAS E NOTAS REAIS DE RH (DISTRIBUÍDO)
  const dadosTreinamentosfakes = [
    { titulo: 'NR-32: Segurança na Saúde', progresso: 100, nota: 9.5, status: 'CONCLUIDO', alunoId: 2 }, // Ana
    { titulo: 'Compliance e Lei Geral de Proteção de Dados (LGPD)', progresso: 100, nota: 8.0, status: 'CONCLUIDO', alunoId: 3 }, // Carlos
    { titulo: 'Prevenção e Controle de Infecção Hospitalar (SCIH)', progresso: 100, nota: 7.0, status: 'CONCLUIDO', alunoId: 4 }, // Roberto
    { titulo: 'NR-10: Segurança em Instalações Elétricas', progresso: 100, nota: 10.0, status: 'CONCLUIDO', alunoId: 2 },
    { titulo: 'Protocolo de Sepse e Atendimento Crítico', progresso: 100, nota: 8.5, status: 'CONCLUIDO', alunoId: 3 },
    { titulo: 'Treinamento de Integração Institucional FUABC', progresso: 100, nota: 7.5, status: 'CONCLUIDO', alunoId: 4 },
    { titulo: 'Humanização no Atendimento Hospitalar', progresso: 100, nota: 9.0, status: 'CONCLUIDO', alunoId: 2 },
    { titulo: 'NR-05: CIPA e Prevenção de Acidentes', progresso: 100, nota: 5.5, status: 'REPROVADO', alunoId: 3 }, // Fatia vermelha!
    { titulo: 'Prontuário Eletrônico e Registro de Enfermagem', progresso: 45, nota: null, status: 'EM_ANDAMENTO', alunoId: 2 },
    { titulo: 'Gestão de Resíduos Serviços de Saúde (PGRSS)', progresso: 100, nota: 6.0, status: 'REPROVADO', alunoId: 4 },
    { titulo: 'Liderança e Gestão de Equipes Médicas', progresso: 12, nota: null, status: 'EM_ANDAMENTO', alunoId: 3 }
  ];

  for (let i = 0; i < dadosTreinamentosfakes.length; i++) {
    const item = dadosTreinamentosfakes[i];

    // 🚀 RASCUNHO REAL: O curso nasce como RASCUNHO (ativo: false) para validar as esteiras
    const curso = await prisma.treinamento.create({
      data: {
        titulo: item.titulo,
        descricao: `Curso regulamentar de atualização de competências e conformidade institucional para a Fundação ABC.`,
        carga_horaria: 8,
        obrigatorio: true,
        ativo: false, // ➔ Fica oculto do Aluno até a publicação pelo Admin!
        certificado: true,
      },
    });

    // 🚀 AJUSTADO: Vincula a matrícula aos alunos adicionais preservando a conta do Julio zerada!
    await prisma.matricula.create({
      data: {
        usuario_id: item.alunoId, // 🌟 Vinculação dinâmica e realista
        treinamento_id: curso.id,
        progresso: item.progresso,
        status: item.status,
        nota: item.nota,
        iniciado_em: new Date(),
        concluido_em: item.status === 'CONCLUIDO' || item.status === 'REPROVADO' ? new Date() : null,
      },
    });
  }

  // 🌟 SINCRONISMO DOS SEQUENCIAIS DO POSTGRESQL: Evita estouros P2003/P2002 em novas inclusões manuais na tela
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE(MAX(id), 1)) FROM "User";`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"KanbanColuna"', 'id'), COALESCE(MAX(id), 1)) FROM "KanbanColuna";`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Treinamento"', 'id'), COALESCE(MAX(id), 1)) FROM "Treinamento";`;

  console.log(`✔️ Catálogo de ${dadosTreinamentosfakes.length} históricos acadêmicos gerado em modo rascunho com sucesso!`);
  console.log('=== 🎉 ENGENHARIA DE SEED FINALIZADA COM SUCESSO ===');
}

main()
  .catch((e) => {
    console.error('❌ Ocorreu um erro crítico durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
