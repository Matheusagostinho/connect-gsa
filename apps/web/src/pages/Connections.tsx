import type { AmbassadorCard } from '@connect-gsa/shared';
import { Users } from 'lucide-react';
import { AmbassadorCardItem } from '../components/AmbassadorCardItem.tsx';
import { AppShell } from '../components/AppShell.tsx';
import { Card } from '../components/ui.tsx';
import { useConnections } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

function Secao({ titulo, pessoas }: { titulo: string; pessoas: AmbassadorCard[] }) {
  if (pessoas.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-medium">
        {titulo} <span className="font-normal text-ink-muted">{pessoas.length}</span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {pessoas.map((pessoa) => (
          <li key={pessoa.id}>
            <AmbassadorCardItem person={pessoa} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ConnectionsPage() {
  const { data: profile } = useMyProfile();
  const { data, isPending } = useConnections();

  if (!profile) return null;

  const vazio =
    !isPending &&
    (data?.connected.length ?? 0) + (data?.received.length ?? 0) + (data?.sent.length ?? 0) === 0;

  return (
    <AppShell profile={profile} width="xl" title="Minhas conexões">

      {isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Carregando…
        </p>
      ) : null}

      {/* Pedidos recebidos vêm primeiro: são os que esperam uma ação sua. */}
      <Secao titulo="Pedidos recebidos" pessoas={data?.received ?? []} />
      <Secao titulo="Conectados" pessoas={data?.connected ?? []} />
      <Secao titulo="Pedidos enviados" pessoas={data?.sent ?? []} />

      {vazio ? (
        <Card className="text-center">
          <Users className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
          <h2 className="display mt-3 text-2xl">Nenhuma conexão ainda</h2>
          <p className="mt-2 text-ink-muted">
            Encontre gente no diretório ou no mapa e mande o primeiro pedido.
          </p>
        </Card>
      ) : null}
    </AppShell>
  );
}
