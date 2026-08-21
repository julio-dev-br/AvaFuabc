-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "usuario_externo_id" BIGINT,
    "empresa_id" BIGINT,
    "unidade_id" BIGINT,
    "departamento_id" BIGINT,
    "cargo_id" BIGINT,
    "matricula" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "sincronizado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treinamento" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "carga_horaria" INTEGER,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "validade_dias" INTEGER,
    "certificado" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treinamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinamentoPublico" (
    "id" SERIAL NOT NULL,
    "treinamento_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia_id" BIGINT NOT NULL,

    CONSTRAINT "TreinamentoPublico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trilha" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Trilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrilhaTreinamento" (
    "id" SERIAL NOT NULL,
    "trilha_id" INTEGER,
    "treinamento_id" INTEGER,
    "ordem" INTEGER,

    CONSTRAINT "TrilhaTreinamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" SERIAL NOT NULL,
    "treinamento_id" INTEGER,
    "titulo" TEXT,
    "ordem" INTEGER,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" SERIAL NOT NULL,
    "modulo_id" INTEGER,
    "titulo" TEXT,
    "descricao" TEXT,
    "video_url" TEXT,
    "duracao_segundos" INTEGER,
    "ordem" INTEGER,

    CONSTRAINT "Aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "aula_id" INTEGER,
    "nome" TEXT,
    "url" TEXT,
    "tipo" TEXT,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" SERIAL NOT NULL,
    "aula_id" INTEGER,
    "titulo" TEXT,
    "nota_minima" DOUBLE PRECISION,
    "tentativas" INTEGER DEFAULT 3,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pergunta" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER,
    "pergunta" TEXT,
    "ordem" INTEGER,

    CONSTRAINT "Pergunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alternativa" (
    "id" SERIAL NOT NULL,
    "pergunta_id" INTEGER,
    "descricao" TEXT,
    "correta" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alternativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "pergunta_id" INTEGER,
    "alternativa_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "treinamento_id" INTEGER,
    "progresso" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT,
    "nota" DOUBLE PRECISION,
    "iniciado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),
    "validade_ate" TIMESTAMP(3),

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressoAula" (
    "id" SERIAL NOT NULL,
    "matricula_id" INTEGER,
    "aula_id" INTEGER,
    "percentual" DOUBLE PRECISION,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "tempo_assistido" INTEGER,
    "ultima_visualizacao" TIMESTAMP(3),

    CONSTRAINT "ProgressoAula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" SERIAL NOT NULL,
    "matricula_id" INTEGER,
    "codigo" TEXT,
    "qr_code" TEXT,
    "emitido_em" TIMESTAMP(3),
    "arquivo_pdf" TEXT,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "titulo" TEXT,
    "mensagem" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicoForum" (
    "id" SERIAL NOT NULL,
    "aula_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicoForum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaForum" (
    "id" SERIAL NOT NULL,
    "topico_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "is_tutor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaForum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColuna" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "KanbanColuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanCard" (
    "id" SERIAL NOT NULL,
    "coluna_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data_entrega" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "TreinamentoPublico" ADD CONSTRAINT "TreinamentoPublico_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "Treinamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrilhaTreinamento" ADD CONSTRAINT "TrilhaTreinamento_trilha_id_fkey" FOREIGN KEY ("trilha_id") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrilhaTreinamento" ADD CONSTRAINT "TrilhaTreinamento_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "Treinamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modulo" ADD CONSTRAINT "Modulo_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "Treinamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aula" ADD CONSTRAINT "Aula_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pergunta" ADD CONSTRAINT "Pergunta_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alternativa" ADD CONSTRAINT "Alternativa_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "Pergunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "Pergunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_alternativa_id_fkey" FOREIGN KEY ("alternativa_id") REFERENCES "Alternativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "Treinamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoAula" ADD CONSTRAINT "ProgressoAula_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoAula" ADD CONSTRAINT "ProgressoAula_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicoForum" ADD CONSTRAINT "TopicoForum_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicoForum" ADD CONSTRAINT "TopicoForum_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaForum" ADD CONSTRAINT "RespostaForum_topico_id_fkey" FOREIGN KEY ("topico_id") REFERENCES "TopicoForum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaForum" ADD CONSTRAINT "RespostaForum_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColuna" ADD CONSTRAINT "KanbanColuna_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_coluna_id_fkey" FOREIGN KEY ("coluna_id") REFERENCES "KanbanColuna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
