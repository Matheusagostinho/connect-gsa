import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /**
   * O MapLibre fica fora do pré-empacotamento de dependências.
   *
   * Ele carrega os tiles vetoriais dentro de um Web Worker, e o worker
   * reescrito pelo otimizador do Vite falha ao ser buscado
   * (`net::ERR_FAILED`). O sintoma é traiçoeiro: o estilo e os sprites vêm da
   * thread principal e carregam normalmente, então o mapa aparece — cinza,
   * sem um único tile, e sem erro visível na tela.
   */
  optimizeDeps: { exclude: ['maplibre-gl'] },
  /**
   * Workers emitidos como módulo ES.
   *
   * O empacotador gera o worker do MapLibre com extensão `.mjs`; instanciá-lo
   * como worker clássico falha ao primeiro `import` — e falha DENTRO do worker,
   * onde o erro não chega ao console da página. O sintoma é o mesmo de um mapa
   * sem tiles: tela cinza, nenhum aviso.
   */
  worker: { format: 'es' },
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
