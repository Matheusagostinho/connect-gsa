/**
 * Service worker do ConnectGSA.
 *
 * Escrito à mão e servido de `public/`, sem empacotador. Duas razões:
 *
 * 1. **Ele precisa viver na raiz do site.** O escopo de um service worker é a
 *    pasta em que ele é servido — de `/assets/sw-a1b2.js` ele só controlaria
 *    `/assets/`, que é o oposto do que se quer.
 * 2. **O nome não pode ter hash.** O navegador compara o arquivo BYTE A BYTE com
 *    o que já registrou para decidir se há versão nova; um nome que muda a cada
 *    build faria cada deploy registrar um worker diferente em vez de atualizar
 *    o existente.
 *
 * ## O que ele NÃO faz
 *
 * Não guarda resposta de API. Numa rede fechada, servir do cache um feed ou um
 * perfil de ontem é pior que dizer "sem conexão": a pessoa não teria como saber
 * que está lendo algo velho, e um perfil em cache sobreviveria a uma exclusão
 * de conta — o titular pediu para sumir e continuaria aparecendo (P-012).
 */

const VERSAO = 'v1';
const CACHE = `connectgsa-${VERSAO}`;

/**
 * O mínimo para a moldura aparecer sem rede.
 *
 * Só o casco: o `index.html` e o ícone. Os pacotes de JavaScript têm hash no
 * nome e são guardados sob demanda — listá-los aqui exigiria que este arquivo
 * soubesse o resultado do build, que ele não sabe.
 */
const CASCO = ['/', '/index.html', '/logo.svg'];

self.addEventListener('install', (evento) => {
  // `skipWaiting` para a versão nova assumir sem esperar todas as abas
  // fecharem. Sem isso, uma correção urgente ficaria presa atrás de uma aba
  // esquecida aberta há dias.
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CASCO))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  // Só GET, e só a nossa origem. Um POST nunca deve sair do cache, e requisição
  // para terceiro (tiles do mapa) não é assunto deste worker.
  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  // A API fica de fora, sempre. Ver o comentário no topo: dado de rede fechada
  // servido do cache é pior que ausência de dado.
  if (url.pathname.startsWith('/api/')) return;

  // Navegação: tenta a rede e recua para o casco. É isto que troca a página de
  // erro do navegador pela moldura do aplicativo quando não há conexão.
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao).catch(() =>
        caches.match('/index.html').then((resposta) => resposta ?? Response.error()),
      ),
    );
    return;
  }

  // Recursos com hash no nome (`/assets/`, `/fonts/`): cache primeiro, porque o
  // conteúdo nunca muda sob o mesmo nome. Isso também os torna disponíveis sem
  // rede depois da primeira visita.
  evento.respondWith(
    caches.match(requisicao).then(
      (guardado) =>
        guardado ??
        fetch(requisicao).then((resposta) => {
          // Só o que deu certo entra no cache: guardar um 404 o transformaria
          // em permanente.
          if (resposta.ok && resposta.type === 'basic') {
            const copia = resposta.clone();
            void caches.open(CACHE).then((cache) => cache.put(requisicao, copia));
          }
          return resposta;
        }),
    ),
  );
});

/**
 * O aviso que chega com o aplicativo fechado.
 *
 * O corpo vem do servidor já pronto para exibição — o worker não consulta a API
 * nem decide texto. Ele roda sem sessão e sem contexto; pedir dado aqui seria
 * pedir de um lugar que não tem permissão para recebê-lo.
 */
self.addEventListener('push', (evento) => {
  if (!evento.data) return;

  let dados;
  try {
    dados = evento.data.json();
  } catch {
    return;
  }

  const titulo = dados.titulo ?? 'ConnectGSA';

  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo ?? '',
      icon: '/icons/icone-192.png',
      badge: '/icons/icone-192.png',
      // `tag` faz o aviso novo SUBSTITUIR o anterior do mesmo assunto, em vez
      // de empilhar. Cinco reações na mesma publicação viram um aviso, não cinco.
      tag: dados.tag ?? 'connectgsa',
      data: { url: dados.url ?? '/notificacoes' },
    }),
  );
});

/**
 * Tocar no aviso leva ao lugar certo — reaproveitando a aba aberta.
 *
 * Sem a busca por aba existente, cada toque abriria uma janela nova, e quem
 * recebe três avisos termina com três cópias do aplicativo.
 */
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = evento.notification.data?.url ?? '/notificacoes';

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if (new URL(aba.url).origin === self.location.origin) {
          return aba.focus().then((focada) => focada.navigate(destino));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
