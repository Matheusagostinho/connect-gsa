import type { InviteInvitation } from '@connect-gsa/shared';
import { inviteCodeSchema } from '@connect-gsa/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Wordmark } from '../components/Logo.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Button, Card, Field, Shell, UnofficialNotice } from '../components/ui.tsx';
import { api } from '../lib/api.js';
import { guardarConvite } from '../lib/invite-guardado.js';

/**
 * A porta do convite.
 *
 * Quando o código vem no endereço (`/convite/ABC5EK9M`), esta página **não pede
 * nada**: ela diz quem convidou e leva ao login. Pedir que a pessoa digite o que
 * já está na barra de endereço era trabalho inventado.
 *
 * O código é conferido ANTES do login social por experiência — descobrir que o
 * convite não presta depois de já ter autorizado o Google seria frustrante.
 * Conferir não consome o convite: quem desistir no meio não queima o próprio
 * acesso.
 */
export function InvitePage() {
  const navigate = useNavigate();
  const { code: codeDaRota } = useParams();
  const [params] = useSearchParams();

  // `?c=` continua sendo lido: links de convite antigos já circularam, e um
  // endereço que já foi compartilhado não pode deixar de funcionar.
  const codigoDoLink = codeDaRota ?? params.get('c') ?? '';

  const [code, setCode] = useState(codigoDoLink);
  const [validationError, setValidationError] = useState<string | undefined>();

  const convite = useQuery({
    queryKey: ['convite', codigoDoLink],
    enabled: inviteCodeSchema.safeParse(codigoDoLink).success,
    retry: false,
    queryFn: () =>
      api.get<InviteInvitation>(`/invites/${encodeURIComponent(codigoDoLink.toUpperCase())}`),
  });

  const check = useMutation({
    mutationFn: (value: string) => api.post<{ ok: true }>('/invites/check', { code: value }),
    onSuccess: (_dados, value) => {
      guardarConvite(value);
      void navigate('/entrar');
    },
  });

  // Guarda assim que o convite se mostra válido, e não só ao seguir para o
  // login: a pessoa pode recarregar, trocar de aba ou voltar depois.
  useEffect(() => {
    if (convite.data) guardarConvite(codigoDoLink);
  }, [convite.data, codigoDoLink]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = inviteCodeSchema.safeParse(code);

    if (!parsed.success) {
      setValidationError('O código tem 8 caracteres — letras e números, sem I, L, O e U.');
      return;
    }

    setValidationError(undefined);
    check.mutate(parsed.data);
  }

  const error = validationError ?? (check.error instanceof Error ? check.error.message : undefined);

  return (
    <Shell>
      <header className="mb-12 flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </header>

      {convite.data ? (
        <>
          <h1 className="display mb-3 text-4xl sm:text-5xl">
            Olá! <span className="spark-text">{convite.data.invitedBy}</span> te convidou
          </h1>
          <p className="mb-10 text-lg text-ink-muted">
            Você foi convidado para a comunidade ConnectGSA, a rede dos participantes do Programa
            de Embaixadores Estudantis do Google. Faça login para continuar.
          </p>

          <Card>
            <p className="text-sm text-ink-muted">
              Entre com Google, LinkedIn ou GitHub. Seu convite fica guardado até você concluir o
              cadastro.
            </p>

            <Button
              type="button"
              className="mt-6 w-full"
              disabled={check.isPending}
              onClick={() => check.mutate(codigoDoLink.toUpperCase())}
            >
              {check.isPending ? 'Um instante…' : 'Continuar para o login'}
            </Button>

            {error ? (
              <p role="alert" className="mt-4 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
          </Card>
        </>
      ) : (
        <>
          <h1 className="display mb-3 text-4xl sm:text-5xl">
            {convite.isError ? 'Convite não encontrado' : 'Você tem um convite?'}
          </h1>
          <p className="mb-10 text-lg text-ink-muted">
            {convite.isError
              ? 'Esse convite não existe, já foi usado ou expirou. Peça outro a quem te chamou.'
              : 'O ConnectGSA é exclusivo para participantes do Programa de Embaixadores Estudantis do Google.'}
          </p>

          <Card>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
              <Field
                id="codigo"
                label="Código do convite"
                hint="8 caracteres, como ABC5EK9M."
                value={code}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={8}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                {...(error ? { error } : {})}
              />

              <Button type="submit" disabled={check.isPending}>
                {check.isPending ? 'Conferindo…' : 'Continuar'}
              </Button>
            </form>
          </Card>
        </>
      )}

      <UnofficialNotice className="mt-16" />
    </Shell>
  );
}
