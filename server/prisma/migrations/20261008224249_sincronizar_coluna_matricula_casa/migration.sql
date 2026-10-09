/*
  Warnings:

  - A unique constraint covering the columns `[usuario_id,treinamento_id]` on the table `Matricula` will be added. If there are existing duplicate values, this will fail.
  - Made the column `usuario_id` on table `Matricula` required. This step will fail if there are existing NULL values in that column.
  - Made the column `treinamento_id` on table `Matricula` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `matricula_id` to the `QuizResponse` table without a default value. This is not possible if the table is not empty.
  - Made the column `usuario_id` on table `QuizResponse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pergunta_id` on table `QuizResponse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `alternativa_id` on table `QuizResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Matricula" ALTER COLUMN "usuario_id" SET NOT NULL,
ALTER COLUMN "treinamento_id" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'EM_ANDAMENTO',
ALTER COLUMN "iniciado_em" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuizResponse" ADD COLUMN     "matricula_id" INTEGER NOT NULL,
ADD COLUMN     "tentativa_nro" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "usuario_id" SET NOT NULL,
ALTER COLUMN "pergunta_id" SET NOT NULL,
ALTER COLUMN "alternativa_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_usuario_id_treinamento_id_key" ON "Matricula"("usuario_id", "treinamento_id");

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
