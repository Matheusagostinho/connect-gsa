-- O convite deixa de ser de uso único: passa a valer para quantas pessoas
-- receberem o link, até expirar.
--
-- A ordem aqui não é arbitrária. A coluna nova nasce e é PREENCHIDA a partir do
-- vínculo antigo antes de ele ser derrubado — invertendo os passos, o histórico
-- de quem entrou por qual convite seria jogado fora sem aviso.

-- 1. Por qual convite cada pessoa entrou.
--
-- O lado "muitos" passou a ser o do usuário, então a chave estrangeira mudou de
-- lado. `SET NULL`: perder o convite não pode apagar quem entrou por ele.
ALTER TABLE "User" ADD COLUMN "invitedViaId" TEXT;

CREATE INDEX "User_invitedViaId_idx" ON "User"("invitedViaId");

ALTER TABLE "User" ADD CONSTRAINT "User_invitedViaId_fkey"
  FOREIGN KEY ("invitedViaId") REFERENCES "InviteCode"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Preserva o vínculo que já existia, antes de a coluna antiga sumir.
UPDATE "User" AS u
SET "invitedViaId" = i."id"
FROM "InviteCode" AS i
WHERE i."usedById" = u."id";

-- 3. O vínculo de uso único sai. Era o índice `@unique` desta coluna que fazia o
-- próprio Postgres recusar o segundo uso do mesmo convite; com ele fora, quem
-- limita o convite é apenas a data de expiração.
ALTER TABLE "InviteCode" DROP CONSTRAINT "InviteCode_usedById_fkey";
DROP INDEX "InviteCode_usedById_key";
ALTER TABLE "InviteCode" DROP COLUMN "usedById";

-- 4. `usedAt` queria dizer "consumido em", e num convite que atende várias
-- pessoas esse nome mente — sugere que o convite acabou ali.
ALTER TABLE "InviteCode" RENAME COLUMN "usedAt" TO "lastUsedAt";

-- 5. Convites em aberto encurtam para o novo prazo de 15 dias.
--
-- Só os que vencem DEPOIS disso: um convite que já vencia amanhã não pode ter a
-- validade esticada por uma migração de encurtamento.
UPDATE "InviteCode"
SET "expiresAt" = NOW() + INTERVAL '15 days'
WHERE "expiresAt" > NOW() + INTERVAL '15 days';
