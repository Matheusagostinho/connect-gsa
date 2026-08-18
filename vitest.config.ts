import { defineConfig } from 'vitest/config';

/**
 * Suíte única do monorepo — é ela que o `onp-spec verify` executa para provar
 * cada critério de aceite (ver `onpspec.config.json`).
 */
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
});
