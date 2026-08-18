import type { MyProfile } from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, School } from 'lucide-react';
import { Link } from 'react-router';
import { Button, Card } from '../components/ui.tsx';
import { api } from '../lib/api.js';
import { useMyProfile } from '../lib/session.js';

/**
 * Perfil do próprio embaixador (US-004, US-005).
 *
 * O interruptor do mapa aplica na hora (AC-016) e o estado exibido vem sempre
 * da resposta do servidor — nunca de um palpite otimista do cliente. Numa
 * escolha de privacidade, mostrar "desligado" antes de o servidor confirmar
 * seria mentir para quem está justamente tentando se proteger.
 */
export function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();

  const privacy = useMutation({
    mutationFn: (visibleOnMap: boolean) =>
      api.patch<MyProfile>('/me/privacy', { visibleOnMap }),
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  });

  if (!profile) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-10">
      <Card>
        <div className="flex items-start gap-4">
          {profile.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt=""
              width={64}
              height={64}
              className="size-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-on-primary"
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold">{profile.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{profile.course}</p>
          </div>
        </div>

        {profile.bio ? <p className="mt-4 text-sm">{profile.bio}</p> : null}

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          {profile.institution ? (
            <div className="flex items-center gap-2">
              <School className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Instituição</dt>
              <dd>{profile.institution.acronym ?? profile.institution.name}</dd>
            </div>
          ) : null}
          {profile.city ? (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Cidade</dt>
              <dd>
                {profile.city.name}/{profile.city.state}
              </dd>
            </div>
          ) : null}
        </dl>

        {profile.skills.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          to="/onboarding"
          className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary underline"
        >
          Editar perfil
        </Link>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Privacidade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se você aparecer no mapa, os outros embaixadores veem a sua cidade — nunca um endereço.
        </p>

        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm font-medium">
            {profile.visibleOnMap ? 'Você aparece no mapa' : 'Você não aparece no mapa'}
          </span>
          <Button
            variant={profile.visibleOnMap ? 'ghost' : 'accent'}
            disabled={privacy.isPending}
            aria-pressed={profile.visibleOnMap}
            onClick={() => privacy.mutate(!profile.visibleOnMap)}
          >
            {privacy.isPending
              ? 'Salvando…'
              : profile.visibleOnMap
                ? 'Sair do mapa'
                : 'Aparecer no mapa'}
          </Button>
        </div>
      </Card>
    </main>
  );
}
