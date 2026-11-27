-- AlterTable
ALTER TABLE "Treinamento" ADD COLUMN     "criado_por_id" INTEGER,
ADD COLUMN     "homologado_em" TIMESTAMP(3),
ADD COLUMN     "homologado_por_id" INTEGER,
ADD COLUMN     "parecer_curadoria" TEXT,
ADD COLUMN     "status_homologacao" TEXT NOT NULL DEFAULT 'RASCUNHO';
