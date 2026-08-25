-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "treinamento_id" INTEGER;

-- AddForeignKey
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "Treinamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
