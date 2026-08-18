import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // A API vive em outra origem. O proxy no desenvolvimento faz o navegador
    // enxergar tudo como mesma origem, para o cookie de sessão se comportar
    // aqui como se comporta em produção — onde ambos ficam sob o mesmo domínio.
    proxy: {
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Separa o que quase nunca muda do código do produto: uma correção no
        // app não invalida o cache do React inteiro no navegador de ninguém.
        // Isso importa mais aqui do que de costume — o plano gratuito do
        // Firebase Hosting limita a transferência diária, e cache que sobrevive
        // a um deploy é transferência que não acontece.
        manualChunks: (id: string) =>
          id.includes('node_modules/react') || id.includes('node_modules/scheduler')
            ? 'react'
            : undefined,
      },
    },
  },
});
