import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button, Card, Shell, Wordmark } from '../components/ui.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { api } from '../lib/api.js';

interface DevUser {
  id: string;
  name: string;
  role: string;
  profileComplete: boolean;
}

const PAPEL: Record<string, string> = {
  admin: 'Administradora',
  moderator: 'Moderador',
  ambassador: 'Embaixador',
};

/**
 * Entrada de desenvolvimento — escolhe uma das pessoas semeadas e entra.
 *
 * Existe só para você navegar pelo aplicativo antes de haver credenciais OAuth.
 * A rota que a alimenta não existe em produção: a API se recusa a registrá-la
 * com `NODE_ENV=production`, e há teste provando isso. O aviso na tela é para
 * ninguém confundir esta porta com o fluxo real.
 */
export function DevLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: users, isPending } = useQuery({
    queryKey: ['dev-users'],
    queryFn: () => api.get<DevUser[]>('/dev/users'),
  });

  const entrar = useMutation({
    mutationFn: (userId: string) => api.post<{ ok: true }>('/dev/login', { userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await navigate('/perfil');
    },
  });

  return (
    <Shell width="lg">
      <header className="mb-10 flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-card border border-border bg-surface-subtle p-4">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">Entrada de desenvolvimento.</span> Serve para
          testar o aplicativo sem credenciais OAuth. Esta tela e a rota que a alimenta não
          existem em produção.
        </p>
      </div>

      <h1 className="display mb-2 text-3xl sm:text-4xl">Entre como…</h1>
      <p className="mb-8 text-base text-ink-muted">
        Cada pessoa tem um papel diferente. Experimente uma administradora para gerar convites,
        ou o Diego para ver o onboarding sendo exigido.
      </p>

      {isPending ? (
        <p className="text-ink-muted" role="status">
          Carregando…
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {users?.map((user) => (
            <li key={user.id}>
              <Card className="flex h-full flex-col gap-4 p-6">
                <div>
                  <p className="text-lg font-medium text-ink">{user.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {PAPEL[user.role] ?? user.role}
                    {user.profileComplete ? '' : ' · perfil incompleto'}
                  </p>
                </div>
                <Button
                  className="mt-auto w-full"
                  disabled={entrar.isPending}
                  onClick={() => entrar.mutate(user.id)}
                >
                  Entrar
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Quer testar o fluxo de verdade?{' '}
        <a href="/convite" className="font-medium text-ink underline">
          Resgatar um convite
        </a>{' '}
        ou{' '}
        <a href="/entrar" className="font-medium text-ink underline">
          entrar com uma conta social
        </a>
        .
      </p>
    </Shell>
  );
}
