import type { AmbassadorCard } from '@connect-gsa/shared';
import { Check, Clock, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router';
import { useConnectionAction } from '../lib/directory.js';
import { Avatar } from './Avatar.tsx';
import { Button, Card } from './ui.tsx';

/**
 * Um embaixador numa lista — diretório, mapa ou conexões.
 *
 * O botão muda com o estado do laço porque as ações disponíveis mudam: quem
 * enviou o pedido só pode cancelar, quem recebeu pode aceitar ou recusar. Um
 * botão único de "conectar" esconderia que existe um pedido esperando resposta.
 */
export function AmbassadorCardItem({ person }: { person: AmbassadorCard }) {
  const { request, accept, remove } = useConnectionAction(person.id);
  const ocupado = request.isPending || accept.isPending || remove.isPending;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <Link to={`/perfil/${person.slug}`} aria-label={`Ver o perfil de ${person.name}`}>
          <Avatar name={person.name} imageUrl={person.imageUrl} size={48} />
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={`/perfil/${person.slug}`} className="block truncate font-medium text-ink hover:underline">
            {person.name}
          </Link>
          <p className="truncate text-sm text-ink-muted">
            {[person.institution, person.course].filter(Boolean).join(' · ')}
          </p>
          {person.city ? <p className="truncate text-sm text-ink-muted">{person.city}</p> : null}
        </div>
      </div>

      {person.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {person.skills.slice(0, 4).map((skill) => (
            <li
              key={skill.slug}
              className="rounded-pill border border-border px-2.5 py-1 text-xs text-ink-muted"
            >
              {skill.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex gap-2">
        {person.connection === 'none' ? (
          <Button className="w-full" disabled={ocupado} onClick={() => request.mutate()}>
            <UserPlus className="size-4" aria-hidden="true" />
            Conectar
          </Button>
        ) : null}

        {person.connection === 'pendingSent' ? (
          <Button variant="outline" className="w-full" disabled={ocupado} onClick={() => remove.mutate()}>
            <Clock className="size-4" aria-hidden="true" />
            Pedido enviado
          </Button>
        ) : null}

        {person.connection === 'pendingReceived' ? (
          <>
            <Button className="flex-1" disabled={ocupado} onClick={() => accept.mutate()}>
              <Check className="size-4" aria-hidden="true" />
              Aceitar
            </Button>
            <Button
              variant="outline"
              aria-label={`Recusar o pedido de ${person.name}`}
              disabled={ocupado}
              onClick={() => remove.mutate()}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </>
        ) : null}

        {person.connection === 'connected' ? (
          <Button variant="outline" className="w-full" disabled={ocupado} onClick={() => remove.mutate()}>
            <Check className="size-4" aria-hidden="true" />
            Conectados
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
