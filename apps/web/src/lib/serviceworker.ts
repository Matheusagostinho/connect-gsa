/**
 * Registra o service worker.
 *
 * Depois do `load`, e não durante: o registro disputa banda com o primeiro
 * desenho da tela, e a instalação baixa o casco inteiro. Adiantá-lo troca um
 * ganho invisível (offline na PRÓXIMA visita) por um atraso visível nesta.
 *
 * Falhar aqui é silencioso de propósito. Navegador sem suporte, contexto sem
 * HTTPS, usuário com service workers desligados — nada disso é motivo para a
 * pessoa ver um erro: o aplicativo funciona igual, só não funciona sem rede.
 */
export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  // Em desenvolvimento o worker atrapalha mais do que ajuda: ele serve a versão
  // guardada e esconde a alteração que você acabou de fazer.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Sem rede offline, e nada além disso quebra.
    });
  });
}
