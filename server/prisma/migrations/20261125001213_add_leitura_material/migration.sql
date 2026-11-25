-- CreateTable
CREATE TABLE "LeituraMaterial" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "lido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeituraMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeituraMaterial_usuario_id_material_id_key" ON "LeituraMaterial"("usuario_id", "material_id");

-- AddForeignKey
ALTER TABLE "LeituraMaterial" ADD CONSTRAINT "LeituraMaterial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraMaterial" ADD CONSTRAINT "LeituraMaterial_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
