-- O e-mail da lista aprovada passa a ser guardado sempre em minúsculas.
--
-- `isEmailAllowed` faz `trim().toLowerCase()` no e-mail que CHEGA do provedor,
-- mas nada normalizava o que estava GRAVADO. Quem inserisse `Fulano@Gmail.com`
-- criava uma linha que nunca casaria com ninguém — e a falha é silenciosa: a
-- pessoa é recusada no portão com a mensagem de "acesso restrito", sem nenhuma
-- pista de que o problema é uma letra maiúscula numa tabela.
--
-- Aconteceu de verdade no primeiro acesso em produção.

-- 1. Conserta o que já está lá.
UPDATE "AllowedEmail" SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));

-- 2. Remove duplicatas que a normalização possa ter criado, mantendo a mais
-- antiga. Sem isto, o índice único do passo seguinte falharia.
DELETE FROM "AllowedEmail" a
USING "AllowedEmail" b
WHERE a.email = b.email AND a."createdAt" > b."createdAt";

-- 3. Impede que volte a acontecer.
--
-- Uma CHECK e não um trigger: o trigger consertaria em silêncio, e consertar em
-- silêncio esconde de quem inseriu que ele digitou errado. A constraint recusa a
-- inserção e diz o motivo — que é o comportamento certo para uma lista que
-- controla quem entra numa rede fechada.
ALTER TABLE "AllowedEmail"
  ADD CONSTRAINT "AllowedEmail_email_minusculo"
  CHECK (email = lower(btrim(email)));
