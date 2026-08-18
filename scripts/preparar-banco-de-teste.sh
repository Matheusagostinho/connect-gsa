#!/usr/bin/env bash
#
# Prepara o banco usado pela suíte de testes.
#
# Existe separado do banco de desenvolvimento porque os testes limpam tabelas
# inteiras entre casos — apontá-los para o mesmo banco apagaria, a cada
# `pnpm test`, os dados semeados para você navegar pelo aplicativo.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [ -z "${TEST_DATABASE_URL:-}" ]; then
  echo "TEST_DATABASE_URL não definida — copie .env.example para .env" >&2
  exit 1
fi

export DATABASE_URL="$TEST_DATABASE_URL"
pnpm --filter @connect-gsa/db exec prisma migrate deploy
pnpm --filter @connect-gsa/db run seed
