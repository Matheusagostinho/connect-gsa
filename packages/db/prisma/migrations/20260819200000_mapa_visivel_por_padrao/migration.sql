-- Perfil novo passa a nascer visível no mapa (P-011, invertido em 2026-08-19).
--
-- Só o DEFAULT muda. Nenhum UPDATE em linha existente de propósito: ligar o mapa
-- de quem já escolheu ficar fora seria desfazer a decisão dessa pessoa pelas
-- costas, e é justamente a escolha que o princípio protege.
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "visibleOnMap" SET DEFAULT true;

