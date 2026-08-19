import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.tsx';
import { DESTINOS } from '../lib/navigation.js';

/**
 * Caminho de um arquivo em `src/components`.
 *
 * `import.meta.url` não serve: sob o transformador do Vite ele é uma URL http,
 * não um caminho de arquivo. O diretório de trabalho varia conforme o teste
 * rode da raiz do monorepo ou do pacote, então tentamos os dois.
 */
function caminhoDe(relativo: string): string {
  const candidatos = [
    path.resolve(process.cwd(), 'src/components', relativo),
    path.resolve(process.cwd(), 'apps/web/src/components', relativo),
  ];

  const encontrado = candidatos.find((c) => existsSync(c));
  if (!encontrado) throw new Error(`não achei ${relativo} em: ${candidatos.join(', ')}`);

  return encontrado;
}

const perfil = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'ana-ribeiro',
  name: 'Ana Ribeiro',
  imageUrl: null,
  role: 'ambassador' as const,
  course: 'Engenharia',
  bio: '',
  skills: [],
  links: [],
  institution: null,
  city: null,
  visibleOnMap: false,
  profileComplete: true,
  createdAt: new Date().toISOString(),
  connection: 'self' as const,
  connectionCount: 0,
  postCount: 0,
};

function renderShell(unreadCount = 0, rota = '/') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ unreadCount }),
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <AppShell profile={perfil}>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('moldura do aplicativo', () => {
  it('oferece os destinos principais nas duas navegações @spec:AC-061 @spec:AC-062', () => {
    renderShell();

    // Duas navegações no documento: a lateral do computador e a inferior do
    // celular. Qual delas aparece é decidido pelo CSS, não pelo JavaScript —
    // então as duas existem, e o teste checa que nenhum destino ficou de fora.
    const navegacoes = screen.getAllByRole('navigation', { name: 'Seções' });
    expect(navegacoes).toHaveLength(2);

    const [lateral, inferior] = navegacoes;

    for (const destino of DESTINOS) {
      expect(within(lateral!).getByRole('link', { name: new RegExp(destino.label, 'i') })).toBeInTheDocument();
    }

    for (const destino of DESTINOS.filter((d) => d.mobile)) {
      expect(within(inferior!).getByRole('link', { name: destino.label })).toBeInTheDocument();
    }
  });

  it('marca a seção atual para quem vê e para quem ouve @spec:AC-063', () => {
    renderShell(0, '/mapa');

    const atuais = screen.getAllByRole('link', { current: 'page' });

    expect(atuais.length).toBeGreaterThan(0);
    expect(atuais.every((l) => /mapa/i.test(l.textContent ?? ''))).toBe(true);
  });

  it('mostra quantas notificações estão por ler @spec:AC-066', async () => {
    renderShell(3);

    expect(await screen.findAllByText('3')).not.toHaveLength(0);
    expect(screen.getAllByText(/3 não lidas/)).not.toHaveLength(0);
  });

  it('não mostra contador quando não há nada por ler', async () => {
    renderShell(0);

    // Espera o contador chegar antes de concluir que ele não aparece.
    await screen.findAllByRole('navigation', { name: 'Seções' });
    expect(screen.queryByText(/não lida/)).not.toBeInTheDocument();
  });

  it('mostra o conteúdo da página', () => {
    renderShell();

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});

describe('uma moldura só para todas as telas', () => {
  it('a navegação lateral vem da mesma moldura em qualquer tela @spec:AC-104', () => {
    // O mapa já teve moldura própria: desenhava o SideNav num contêiner sem a
    // largura máxima das outras telas, e a coluna saltava oitenta pixels ao
    // trocar de seção. Este teste guarda a causa, não o sintoma — o jsdom não
    // calcula layout, mas dá para provar que existe UM lugar que desenha a
    // navegação, e que nenhuma página desenha a sua.
    const paginas = readdirSync(path.resolve(caminhoDe('..'), 'pages')).filter((f) =>
      f.endsWith('.tsx'),
    );

    const desenhamNavegacao = paginas.filter((arquivo) =>
      readFileSync(path.resolve(caminhoDe('..'), 'pages', arquivo), 'utf8').includes('<SideNav'),
    );

    expect(desenhamNavegacao).toEqual([]);
  });

  it('Conexões não é destino de navegação; o perfil leva até ela @spec:AC-124', () => {
    renderShell();

    // Conexões é uma lista que pertence ao seu perfil, não uma seção da rede.
    // Navegação que cresce com tudo que existe para de orientar.
    expect(DESTINOS.some((d) => d.to === '/conexoes')).toBe(false);
    expect(screen.queryByRole('link', { name: /conexões/i })).not.toBeInTheDocument();
  });

  it('uma largura só para toda tela @spec:AC-104', () => {
    const fonte = readFileSync(caminhoDe('AppShell.tsx'), 'utf8');

    // Eram duas, e a diferença aparecia como um salto do conteúdo ao trocar de
    // seção. Nenhuma página escolhe a própria — a moldura não aceita mais.
    expect(fonte).not.toMatch(/width\?:/);

    const paginas = readdirSync(path.resolve(caminhoDe('..'), 'pages')).filter((f) =>
      f.endsWith('.tsx'),
    );
    const escolhemLargura = paginas.filter((arquivo) =>
      /<AppShell[^>]*width=/s.test(
        readFileSync(path.resolve(caminhoDe('..'), 'pages', arquivo), 'utf8'),
      ),
    );

    expect(escolhemLargura).toEqual([]);
  });

  it('o modo imersivo entrega a altura da tela e flutua o cabeçalho @spec:AC-104', () => {
    const fonte = readFileSync(caminhoDe('AppShell.tsx'), 'utf8');

    // `dvh` e não `vh`: no celular a barra do navegador muda a altura visível.
    expect(fonte).toContain('h-dvh');
    // O cabeçalho sai do fluxo em vez de empilhar antes do conteúdo — é o que
    // faz o mapa começar no topo da tela em vez de abaixo de uma faixa.
    expect(fonte).toContain('pointer-events-none absolute inset-x-0 top-0');
  });
});
