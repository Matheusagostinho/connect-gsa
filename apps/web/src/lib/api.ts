/**
 * Cliente HTTP da API.
 *
 * `credentials: 'include'` em toda chamada não é detalhe: a sessão vive num
 * cookie httpOnly (P-008), então o SPA não tem — e não deve ter — token algum
 * para anexar num cabeçalho. Sem esta opção, o navegador simplesmente não
 * envia o cookie e tudo responde 401.
 */
/**
 * Raiz da API.
 *
 * Em desenvolvimento fica relativa (`/api`) e o proxy do Vite encaminha para o
 * Fastify — assim o navegador vê tudo como mesma origem e o cookie de sessão se
 * comporta como em produção. Em produção, `VITE_API_URL` traz a URL do Cloud
 * Run **incluindo o `/api`**, porque é sob esse prefixo que as rotas do
 * aplicativo vivem.
 *
 * `ImportMetaEnv` tem assinatura de índice aberta, então o acesso devolve `any`
 * — a anotação explícita é o que impede isso de contaminar as chamadas abaixo.
 */
const BASE_URL: string = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    // A API sempre responde `{ code, message }`; a mensagem já vem escrita para
    // o usuário final ler, então é ela que sobe para a tela.
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;

    throw new ApiError(
      response.status,
      body?.message ?? 'Não foi possível concluir. Tente novamente.',
      body?.code ?? 'UNKNOWN',
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

/** Endereço para onde o navegador é enviado ao entrar com um provedor social. */
export function socialSignInUrl(provider: 'google' | 'github' | 'linkedin'): string {
  const callback = encodeURIComponent(`${window.location.origin}/onboarding`);
  return `${BASE_URL}/auth/sign-in/social?provider=${provider}&callbackURL=${callback}`;
}
