import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Testes de integração compartilham um Postgres: rodar arquivos em paralelo
    // faria um limpar a tabela que o outro está usando.
    fileParallelism: false,
  },
});
