import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Configuração base de lint do ConnectGSA.
 *
 * As regras abaixo não são estilo: elas defendem princípios da constituição
 * (`.spec/constituicao.md`). Mexer nelas é decisão de arquitetura, não de gosto.
 */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      // P-005: dado pessoal nunca vai para log. `console` direto escapa da
      // redação configurada no logger do Fastify — use o logger da requisição.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Promise ignorada em rota de API vira erro silencioso em produção.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  prettier,
);
