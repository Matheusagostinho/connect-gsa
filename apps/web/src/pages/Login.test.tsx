import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './Login.tsx';

/**
 * A tela de entrada.
 *
 * O teste que importa aqui é o do MÉTODO: `/auth/sign-in/social` é POST no
 * Better Auth, e a tela antes montava a URL à mão e navegava com um GET. O
 * servidor respondia 404 com corpo `null` e ninguém entrava.
 *
 * Esse defeito não tinha como aparecer em desenvolvimento — sem credencial de
 * OAuth, quem testava entrava pela tela `/dev`, e este caminho nunca era
 * exercitado. Só apareceu no primeiro clique em produção, e é por isso que ele
 * ganhou teste.
 */
function montar(resposta: { ok: boolean; corpo: unknown }, rota = '/entrar') {
  const chamadas: Array<{ url: string; method: string; body: unknown }> = [];
  const destinos: string[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      chamadas.push({
        url: String(url),
        method: init?.method ?? 'GET',
        // `BodyInit` inclui tipos que não viram texto útil com `String()`. Aqui
        // o corpo é sempre o JSON que o cliente montou; estreitar para `string`
        // é o que diz isso ao compilador em vez de confiar na coerção.
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      });
      return Promise.resolve({
        ok: resposta.ok,
        status: resposta.ok ? 200 : 403,
        json: () => Promise.resolve(resposta.corpo),
      });
    }),
  );

  // `window.location.assign` não existe em jsdom; substituir é o que permite
  // observar PARA ONDE a tela mandaria o navegador sem sair da página.
  vi.stubGlobal('location', {
    origin: 'https://connect-gsa.vercel.app',
    assign: (destino: string) => destinos.push(destino),
  });

  render(
    <MemoryRouter initialEntries={[rota]}>
      <LoginPage />
    </MemoryRouter>,
  );

  return { chamadas, destinos };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tela de entrada', () => {
  it('mostra só o Google, e não os provedores escondidos', () => {
    montar({ ok: true, corpo: { url: 'https://accounts.google.com/o/oauth2/v2/auth' } });

    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
    // Escondidos na tela, mas ainda aceitos pelo servidor: quem já entrou por
    // eles continua entrando, e religar é trocar uma palavra.
    expect(screen.queryByRole('button', { name: /LinkedIn/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /GitHub/i })).not.toBeInTheDocument();
  });

  it('pede a entrada por POST e leva o navegador ao endereço devolvido', async () => {
    const destino = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x';
    const { chamadas, destinos } = montar({ ok: true, corpo: { url: destino, redirect: true } });

    await userEvent.click(screen.getByRole('button', { name: /Google/i }));

    const pedido = chamadas.find((c) => c.url.includes('/auth/sign-in/social'));

    // O MÉTODO é o ponto deste teste. Com GET, o Better Auth responde 404 e
    // corpo `null`, e a tela navega para lugar nenhum.
    expect(pedido?.method).toBe('POST');
    expect(pedido?.body).toMatchObject({
      provider: 'google',
      callbackURL: 'https://connect-gsa.vercel.app/onboarding',
    });

    // E quem decide o destino é o SERVIDOR, não uma URL montada no cliente.
    expect(destinos).toEqual([destino]);
  });

  it('traduz o erro com que o Better Auth devolve a pessoa @spec:AC-004', () => {
    // Antes disto, quem tropeçava no meio do OAuth caía numa página JSON no
    // domínio da API — endereço errado, sem explicação e sem volta.
    montar({ ok: true, corpo: {} }, '/entrar?error=unable_to_create_user');

    expect(screen.getByRole('alert')).toHaveTextContent(/restrita a quem participa/i);
  });

  it('não inventa mensagem para código que não conhece', () => {
    montar({ ok: true, corpo: {} }, '/entrar?error=coisa_nova_do_better_auth');

    // Recado genérico, mas ainda ACIONÁVEL: manda abrir o link do convite.
    expect(screen.getByRole('alert')).toHaveTextContent(/convite/i);
  });

  it('não mostra alerta quando não há erro na URL', () => {
    montar({ ok: true, corpo: {} });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa sem sair da página quando o servidor recusa', async () => {
    const { destinos } = montar({
      ok: false,
      corpo: { message: 'Invalid callbackURL', code: 'INVALID_CALLBACK_URL' },
    });

    await userEvent.click(screen.getByRole('button', { name: /Google/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // Nada de mandar o navegador para `undefined`, que é o que aconteceria se
    // o erro não fosse tratado.
    expect(destinos).toEqual([]);
  });
});
