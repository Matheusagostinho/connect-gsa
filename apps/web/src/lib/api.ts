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
      // O cabeçalho só entra quando há corpo. Anunciar `application/json` e não
      // mandar nada faz o servidor recusar com "Body cannot be empty" — que foi
      // o que quebrava, de uma vez só, apagar publicação, apagar comentário e
      // desfazer conexão.
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
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
  remove: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Envio de arquivo.
 *
 * Não define `Content-Type`: o navegador precisa gerar o `boundary` do
 * multipart sozinho, e escrever o cabeçalho na mão faria o servidor não
 * conseguir separar as partes.
 */
export async function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(response.status, body?.message ?? 'Não foi possível enviar a imagem.', 'UPLOAD');
  }

  return (await response.json()) as T;
}

export function logout(): Promise<{ ok: true }> {
  return api.post<{ ok: true }>('/auth/logout');
}

/**
 * Começa a entrada por um provedor social.
 *
 * São DOIS passos, e não um: o Better Auth expõe `/auth/sign-in/social` como
 * **POST**, devolve o endereço do provedor no corpo, e só então o navegador vai
 * para lá. Antes isto montava a URL à mão e navegava direto — um GET, que o
 * Better Auth responde com 404 e corpo `null`.
 *
 * Aquele defeito não tinha como aparecer em desenvolvimento: sem credencial de
 * OAuth, quem testava entrava pela tela `/dev`, e este caminho nunca era
 * exercitado. Só apareceu no primeiro clique em produção.
 *
 * O `callbackURL` é validado pelo servidor contra `WEB_ORIGINS`. Se ele não
 * incluir a origem exata do SPA, a resposta é `INVALID_CALLBACK_URL` — e é
 * config, não código.
 */
export async function socialSignIn(provider: 'google' | 'github' | 'linkedin'): Promise<void> {
  const { url } = await api.post<{ url: string; redirect: boolean }>('/auth/sign-in/social', {
    provider,
    callbackURL: `${window.location.origin}/onboarding`,
  });

  window.location.assign(url);
}
