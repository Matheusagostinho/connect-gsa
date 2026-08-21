-- Aparelhos inscritos para receber aviso por notificação.
--
-- A notificação continua DERIVADA do que já está no banco (ASM-019): esta
-- tabela não a duplica. Ela guarda o aparelho, que é outra coisa — a notificação
-- é calculada a cada consulta; o aparelho é um registro que nasce quando alguém
-- autoriza e morre quando desinstala.
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- O `endpoint` é único porque é ele que o navegador garante ser único por
-- aparelho e por origem. `userId` não serviria: a mesma pessoa se inscreve no
-- celular e no computador, e são duas entregas.
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- Cascade: excluir a conta leva as inscrições junto, senão o aparelho
-- continuaria recebendo aviso de uma rede da qual a pessoa saiu.
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
