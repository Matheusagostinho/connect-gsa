import type { MyProfile } from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { AppNav } from '../components/AppNav.tsx';
import { AvatarUpload } from '../components/AvatarUpload.tsx';
import { InviteShare } from '../components/InviteShare.tsx';
import { Button, Card, Shell, UnofficialNotice } from '../components/ui.tsx';
import { api } from '../lib/api.js';
import { useMyProfile } from '../lib/session.js';

const PAPEL: Record<string, string> = {
  admin: 'Administração do programa',
  moderator: 'Moderação',
  ambassador: 'Embaixador',
};

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
    mutationFn: (visibleOnMap: boolean) => api.patch<MyProfile>('/me/privacy', { visibleOnMap }),
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  });

  if (!profile) return null;

  return (
    <Shell width="lg">
      <AppNav profile={profile} />

      <Card className="mb-4">
        <div className="flex items-start gap-5">
          <AvatarUpload profile={profile} />

          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-3xl">{profile.name}</h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              {PAPEL[profile.role] ?? profile.role}
              {profile.course ? ` · ${profile.course}` : ''}
            </p>
          </div>
        </div>

        {profile.bio ? <p className="mt-6 text-base leading-relaxed">{profile.bio}</p> : null}

        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          {profile.institution ? (
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Instituição</dt>
              <dd>{profile.institution.acronym ?? profile.institution.name}</dd>
            </div>
          ) : null}
          {profile.city ? (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Cidade</dt>
              <dd>
                {profile.city.name}/{profile.city.state}
              </dd>
            </div>
          ) : null}
        </dl>

        {profile.skills.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li
                key={skill.slug}
                className="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-ink-muted"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          to="/onboarding"
          className="mt-8 inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-ink underline"
        >
          Editar perfil
        </Link>
      </Card>

      <Card>
        <h2 className="text-xl font-medium">Privacidade</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Se você aparecer no mapa, os outros embaixadores veem a sua cidade — nunca um endereço.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm font-medium">
            {profile.visibleOnMap ? 'Você aparece no mapa' : 'Você não aparece no mapa'}
          </span>
          <Button
            variant={profile.visibleOnMap ? 'outline' : 'primary'}
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

      {profile.role === 'admin' || profile.role === 'moderator' ? (
        <div className="mt-4">
          <InviteShare />
        </div>
      ) : null}

      <UnofficialNotice className="mt-16" />
    </Shell>
  );
}
