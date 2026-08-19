import { Check, Clock, GraduationCap, MapPin, UserPlus, X } from 'lucide-react';
import { useParams } from 'react-router';
import { AppShell } from '../components/AppShell.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { PostCard } from '../components/PostCard.tsx';
import { Button, Card } from '../components/ui.tsx';
import { useAuthorPosts, useConnectionAction, usePublicProfile } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

/**
 * O perfil de outro embaixador, no endereço `/e/{slug}`.
 *
 * É a página que circula em conversa, então o endereço precisa ser legível e
 * estável — daí o slug em vez do id (AC-046).
 */
export function PublicProfilePage() {
  const { slug = '' } = useParams();
  const { data: me } = useMyProfile();
  const { data: profile, isPending, error } = usePublicProfile(slug);
  const { data: posts = [] } = useAuthorPosts(slug);
  const { request, accept, remove } = useConnectionAction(profile?.id ?? '');

  if (!me) return null;

  const souEu = profile?.id === me.id;
  const ocupado = request.isPending || accept.isPending || remove.isPending;

  return (
    <AppShell profile={me} width="lg">

      {isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Carregando…
        </p>
      ) : null}

      {error instanceof Error ? (
        <Card className="text-center">
          <h1 className="display text-2xl">Perfil não encontrado</h1>
          <p className="mt-2 text-ink-muted">
            Esse endereço não existe, ou a pessoa ainda não concluiu o perfil.
          </p>
        </Card>
      ) : null}

      {profile ? (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar name={profile.name} imageUrl={profile.imageUrl} size={72} />

              <div className="min-w-0 flex-1">
                <h1 className="display truncate text-3xl">{profile.name}</h1>
                <p className="mt-1.5 text-sm text-ink-muted">{profile.course}</p>

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Instituição</dt>
                    <dd>
                      {profile.institution.acronym ?? profile.institution.name}
                      {profile.institution.campus ? ` — ${profile.institution.campus}` : ''}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Cidade</dt>
                    <dd>
                      {profile.city.name}/{profile.city.state}
                    </dd>
                  </div>
                </dl>
              </div>

              {!souEu ? (
                <div className="flex gap-2">
                  {profile.connection === 'none' ? (
                    <Button disabled={ocupado} onClick={() => request.mutate()}>
                      <UserPlus className="size-4" aria-hidden="true" />
                      Conectar
                    </Button>
                  ) : null}
                  {profile.connection === 'pendingSent' ? (
                    <Button variant="outline" disabled={ocupado} onClick={() => remove.mutate()}>
                      <Clock className="size-4" aria-hidden="true" />
                      Pedido enviado
                    </Button>
                  ) : null}
                  {profile.connection === 'pendingReceived' ? (
                    <>
                      <Button disabled={ocupado} onClick={() => accept.mutate()}>
                        <Check className="size-4" aria-hidden="true" />
                        Aceitar
                      </Button>
                      <Button
                        variant="outline"
                        aria-label="Recusar o pedido"
                        disabled={ocupado}
                        onClick={() => remove.mutate()}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                  {profile.connection === 'connected' ? (
                    <Button variant="outline" disabled={ocupado} onClick={() => remove.mutate()}>
                      <Check className="size-4" aria-hidden="true" />
                      Conectados
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {profile.bio ? <p className="mt-6 text-base leading-relaxed">{profile.bio}</p> : null}

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

            {profile.links.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-4 text-sm">
                {profile.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium text-ink underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <h2 className="mb-4 text-xl font-medium">Publicações</h2>

          {posts.length === 0 ? (
            <Card className="text-center text-ink-muted">Nada publicado ainda.</Card>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
