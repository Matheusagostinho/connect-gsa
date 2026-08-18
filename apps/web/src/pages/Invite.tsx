import { useMutation } from '@tanstack/react-query';
import { inviteCodeSchema } from '@connect-gsa/shared';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api.js';
import { Button, Card, Field } from '../components/ui.tsx';

/**
 * Primeira porta: o código de convite.
 *
 * O código é conferido ANTES do login social por um motivo de experiência —
 * descobrir que o convite não presta depois de já ter autorizado o Google seria
 * frustrante e confuso. Conferir aqui não consome o convite: quem desistir no
 * meio do caminho não queima o próprio acesso.
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="text-2xl font-extrabold">Você tem um convite?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O ConnectGSA é exclusivo para participantes do Programa de Embaixadores Estudantis do
          Google. Informe o código que a coordenação enviou.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field
            id="codigo"
            label="Código do convite"
            hint="32 caracteres, sem espaços."
            value={code}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setCode(event.target.value)}
            {...(error ? { error } : {})}
          />

          <Button type="submit" disabled={check.isPending}>
            {check.isPending ? 'Conferindo…' : 'Continuar'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Seu e-mail já está na lista oficial do programa?{' '}
          <a href="/entrar" className="font-semibold text-primary underline">
            Entre direto
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
