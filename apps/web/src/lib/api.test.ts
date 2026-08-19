import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

/** Captura o que o cliente realmente mandou na rede. */
function espionarFetch(resposta: { status?: number; body?: unknown } = {}) {
  const espiao = vi.fn().mockResolvedValue({
    ok: (resposta.status ?? 200) < 400,
    status: resposta.status ?? 200,
    json: () => Promise.resolve(resposta.body ?? {}),
  });
  vi.stubGlobal('fetch', espiao);
  return espiao;
}

const cabecalhos = (espiao: ReturnType<typeof espionarFetch>): Record<string, string> =>
  (espiao.mock.calls[0]?.[1] as { headers?: Record<string, string> })?.headers ?? {};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cliente HTTP', () => {
  it('não anuncia JSON quando não manda corpo @spec:AC-096', async () => {
    const espiao = espionarFetch({ status: 204 });

    await api.remove('/posts/abc');

    // Anunciar `application/json` sem corpo faz o servidor recusar com
    // "Body cannot be empty" — quebrava apagar publicação e desfazer conexão.
    expect(cabecalhos(espiao)['Content-Type']).toBeUndefined();
  });

  it('anuncia JSON quando manda corpo', async () => {
    const espiao = espionarFetch();

    await api.post('/posts', { content: 'olá' });

    expect(cabecalhos(espiao)['Content-Type']).toBe('application/json');
  });

  it('manda o cookie de sessão em toda requisição', async () => {
    const espiao = espionarFetch();

    await api.get('/me');

    // A sessão é cookie httpOnly; sem isto o navegador não o envia e tudo dá 401.
    expect((espiao.mock.calls[0]?.[1] as RequestInit).credentials).toBe('include');
  });

  it('devolve a mensagem que o servidor escreveu para o usuário ler', async () => {
    espionarFetch({ status: 403, body: { code: 'FORBIDDEN', message: 'Você não tem permissão.' } });

    await expect(api.get('/posts')).rejects.toThrow('Você não tem permissão.');
  });
});
