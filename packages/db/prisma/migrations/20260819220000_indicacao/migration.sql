-- A indicação: quem trouxe cada pessoa para a rede.
--
-- `ON DELETE SET NULL` e nunca CASCADE. Com cascade, excluir um embaixador
-- apagaria em silêncio todo mundo que ele convidou.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitedById" TEXT;

-- CreateIndex
CREATE INDEX "User_invitedById_idx" ON "User"("invitedById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Preenche o histórico a partir dos convites já usados.
--
-- O vínculo sempre existiu em `InviteCode` (quem criou → quem usou); ele só não
-- sobrevivia à exclusão de quem convidou, porque a linha do convite tem cascade.
-- Sem este passo, a rede começaria a contar indicações do zero e o histórico
-- que já está no banco seria jogado fora.
UPDATE "User" AS u
SET "invitedById" = i."createdById"
FROM "InviteCode" AS i
WHERE i."usedById" = u."id"
  AND u."invitedById" IS NULL
  AND i."createdById" <> u."id";
