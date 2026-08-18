import { inviteCodeSchema } from '@connect-gsa/shared';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Button, Card, Field, Shell, UnofficialNotice, Wordmark } from '../components/ui.tsx';
import { api } from '../lib/api.js';

/**
 * Primeira porta: o código de convite.
 *
 * O código é conferido ANTES do login social por um motivo de experiência —
 * descobrir que o convite não presta depois de já ter autorizado o Google seria
 * frustrante. Conferir aqui não consome o convite: quem desistir no meio do
 * caminho não queima o próprio acesso.
 */
export function InvitePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const check = useMutation({
    mutationFn: (value: string) => api.post<{ ok: true }>('/invites/check', { code: value }),
    onSuccess: () => navigate('/entrar'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = inviteCodeSchema.safeParse(code);

    if (!parsed.success) {
      setValidationError('O código tem 32 caracteres, entre 0-9 e a-f.');
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

      <h1 className="display mb-3 text-4xl sm:text-5xl">Você tem um convite?</h1>
      <p className="mb-10 text-lg text-ink-muted">
        O ConnectGSA é exclusivo para participantes do Programa de Embaixadores Estudantis do
        Google.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <Field
            id="codigo"
            label="Código do convite"
            hint="32 caracteres, sem espaços."
            value={code}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            onChange={(event) => setCode(event.target.value)}
            {...(error ? { error } : {})}
          />

          <Button type="submit" disabled={check.isPending}>
            {check.isPending ? 'Conferindo…' : 'Continuar'}
          </Button>
        </form>
      </Card>

      <p className="mt-8 text-sm text-ink-muted">
        Seu e-mail já está na lista oficial do programa?{' '}
        <a href="/entrar" className="font-medium text-ink underline">
          Entre direto
        </a>
        .
      </p>

      <UnofficialNotice className="mt-16" />
    </Shell>
  );
}
