-- O Better Auth 1.7 consulta `Account` por `[issuer, accountId]`.
--
-- Sem a coluna, o Prisma recusa a consulta em `findAccountOwnerByKey` — que roda
-- no RETORNO do OAuth — e o login inteiro morre com `internal_server_error`, sem
-- dizer qual campo falta. Foi o que travou o primeiro login real com o Google.
--
-- Não aparecia em teste: o `testUtils` grava pelo `internalAdapter` sem passar
-- pelo caminho de vínculo de conta, que é onde `issuer` é lido.

-- 1. A coluna nasce aceitando nulo, para as linhas existentes não quebrarem.
ALTER TABLE "Account" ADD COLUMN "issuer" TEXT;

-- 2. Preenche o que já existe, traduzindo o `providerId` para o emissor.
--
-- Estes são os três provedores que a rede usa. Qualquer outro fica com o próprio
-- `providerId` como emissor: é melhor um valor honesto e estranho do que um nulo
-- que derruba o índice — e ninguém entrou por outro provedor.
UPDATE "Account" SET "issuer" = CASE "providerId"
  WHEN 'google'   THEN 'https://accounts.google.com'
  WHEN 'github'   THEN 'https://github.com'
  WHEN 'linkedin' THEN 'https://www.linkedin.com/oauth'
  ELSE "providerId"
END
WHERE "issuer" IS NULL;

-- 3. Agora que não há nulo, a coluna passa a ser obrigatória.
ALTER TABLE "Account" ALTER COLUMN "issuer" SET NOT NULL;

-- 4. O índice único muda de par.
DROP INDEX IF EXISTS "Account_providerId_accountId_key";
CREATE UNIQUE INDEX "Account_issuer_accountId_key" ON "Account"("issuer", "accountId");
