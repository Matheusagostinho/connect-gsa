import type { MyProfile, PublicProfile } from '@connect-gsa/shared';
import { Check, Clock, GraduationCap, MapPin, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Avatar.tsx';
import { AvatarUpload } from './AvatarUpload.tsx';
import { PostCard } from './PostCard.tsx';
import { useAuthorPosts, useConnectionAction } from '../lib/directory.js';
import { Button, cn } from './ui.tsx';

const PAPEL: Partial<Record<string, string>> = {
  admin: 'Coordenação',
  moderator: 'Moderação',
};

type Aba = 'posts' | 'skills' | 'links';

/**
 * A faixa do perfil, derivada do identificador da pessoa.
 *
 * Sem upload de capa: guardar uma imagem grande por pessoa custa cota de
 * armazenamento e de transferência num plano gratuito, e a rede ainda nem
 * subiu. Derivar do id dá o que a capa entrega de fato — cada perfil parecer
 * distinto — a custo zero, e o resultado é estável entre visitas, o que uma
 * cor sorteada não seria.
 */
function faixaDe(id: string): string {
  // O resto por 360 fica para o FIM. Aplicá-lo a cada passo derreteria a
  // entropia — `soma * 31 % 360` entra em ciclo curto, e dois identificadores
  // diferentes caíam no mesmo tom. Aqui a mistura acontece em 32 bits inteiros,
  // e só o resultado final vira ângulo.
  let hash = 5381;
  for (const caractere of id) hash = ((hash * 33) ^ caractere.charCodeAt(0)) >>> 0;

  const tom = hash % 360;
  return `linear-gradient(115deg, hsl(${tom} 62% 58%), hsl(${(tom + 48) % 360} 68% 46%))`;
}

function mesDeEntrada(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * A apresentação de um perfil — o meu ou o de outra pessoa.
 *
 * Um componente só, e não dois: perfil próprio e perfil de terceiro já
 * existiam em arquivos separados e já tinham divergido — o público mostrava
 * campus e links, o próprio não, sem que ninguém tivesse decidido isso. O que
 * de fato muda entre os dois é a AÇÃO disponível (editar, ou pedir conexão), e
 * é só isso que este componente ramifica.
 *
 * A composição mistura os dois padrões do sistema de propósito:
 *
 * - **Box** para a identidade — uma superfície contínua, com a faixa sangrando
 *   até a borda e o avatar cavalgando nela. Identidade é uma coisa só; parti-la
 *   em cartões faria o nome, a foto e a bio parecerem três informações
 *   independentes.
 * - **Cards** para as publicações — cada uma é uma unidade separável, que
 *   aparece igual aqui e no feed.
 */
export function ProfileView({
  profile,
  eu,
}: {
  profile: PublicProfile | MyProfile;
  /** Presente quando o perfil é o de quem está lendo. */
  eu?: MyProfile;
}) {
  const [aba, setAba] = useState<Aba>('posts');
  const { data: posts = [] } = useAuthorPosts(profile.slug);
  const { request, accept, remove } = useConnectionAction(profile.id);

  const souEu = eu !== undefined;
  const ocupado = request.isPending || accept.isPending || remove.isPending;
  const papel = PAPEL[profile.role];

  const abas: { value: Aba; label: string; total: number }[] = [
    { value: 'posts', label: 'Publicações', total: profile.postCount },
    { value: 'skills', label: 'Habilidades', total: profile.skills.length },
    { value: 'links', label: 'Links', total: profile.links.length },
  ];

  return (
    <>
      <section
        aria-label={`Perfil de ${profile.name}`}
        className="overflow-hidden rounded-card border border-border bg-surface-raised"
      >
        <div
          aria-hidden="true"
          className="h-28 w-full sm:h-36"
          style={{ backgroundImage: faixaDe(profile.id) }}
        />

        <div className="px-5 pb-4 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/*
              O avatar cavalga a faixa com margem negativa, e o anel da cor da
              superfície recorta a foto do fundo. Sem o anel, a foto encosta no
              gradiente e as duas se misturam.
            */}
            <div className="-mt-12 rounded-full ring-4 ring-surface-raised sm:-mt-14">
              {souEu ? (
                <AvatarUpload profile={eu} size={96} />
              ) : (
                <Avatar name={profile.name} imageUrl={profile.imageUrl} size={96} />
              )}
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {/*
                Um link, não um botão com `onClick` que navega: editar o perfil
                é ir para outro endereço, e só o link dá o menu de contexto, o
                "abrir em nova aba" e o destino na barra de status.
              */}
              {souEu ? (
                <Link
                  to="/onboarding"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-pill border border-border-strong px-5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
                >
                  Editar perfil
                </Link>
              ) : null}

              {!souEu && profile.connection === 'none' ? (
                <Button disabled={ocupado} onClick={() => request.mutate()}>
                  <UserPlus className="size-4" aria-hidden="true" />
                  Conectar
                </Button>
              ) : null}
              {!souEu && profile.connection === 'pendingSent' ? (
                <Button variant="outline" disabled={ocupado} onClick={() => remove.mutate()}>
                  <Clock className="size-4" aria-hidden="true" />
                  Pedido enviado
                </Button>
              ) : null}
              {!souEu && profile.connection === 'pendingReceived' ? (
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
              {!souEu && profile.connection === 'connected' ? (
                <Button variant="outline" disabled={ocupado} onClick={() => remove.mutate()}>
                  <Check className="size-4" aria-hidden="true" />
                  Conectados
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <h1 className="display text-2xl sm:text-3xl">{profile.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span>@{profile.slug}</span>
              {papel ? (
                <span className="rounded-pill border border-border px-2 py-0.5 text-xs font-medium text-ink">
                  {papel}
                </span>
              ) : null}
            </p>
          </div>

          {profile.bio ? (
            <p className="mt-4 leading-relaxed break-words">{profile.bio}</p>
          ) : null}

          <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            {profile.institution ? (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
                <dt className="sr-only">Instituição</dt>
                <dd>
                  {profile.institution.acronym ?? profile.institution.name}
                  {profile.institution.campus ? ` — ${profile.institution.campus}` : ''}
                </dd>
              </div>
            ) : null}
            {profile.institution ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Curso</dt>
                <dd>{profile.course}</dd>
              </div>
            ) : null}
            {profile.city ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <dt className="sr-only">Cidade</dt>
                <dd>
                  {profile.city.name}/{profile.city.state}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Na rede desde</dt>
              <dd>Entrou em {mesDeEntrada(profile.createdAt)}</dd>
            </div>
          </dl>

          <p className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link to="/conexoes" className="text-ink-muted transition-colors hover:text-ink">
              <strong className="font-medium text-ink">{profile.connectionCount}</strong>{' '}
              {profile.connectionCount === 1 ? 'conexão' : 'conexões'}
            </Link>
            <span className="text-ink-muted">
              <strong className="font-medium text-ink">{profile.postCount}</strong>{' '}
              {profile.postCount === 1 ? 'publicação' : 'publicações'}
            </span>
          </p>
        </div>

        {/*
          As abas fecham o box, encostadas na borda inferior: elas pertencem à
          identidade acima e comandam o que vem abaixo — ficar entre as duas
          coisas é literalmente o papel delas.
        */}
        <div role="tablist" aria-label="O que ver deste perfil" className="mt-2 flex border-t border-border">
          {abas.map(({ value, label, total }) => {
            const ativa = aba === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(value)}
                className={cn(
                  'relative flex-1 cursor-pointer px-3 py-3 text-sm transition-colors duration-200',
                  ativa ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                {label}
                <span className="ml-1.5 text-xs text-ink-muted">{total}</span>
                {ativa ? (
                  <span
                    aria-hidden="true"
                    className="spark-gradient absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-pill"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-4">
        {aba === 'posts' ? (
          posts.length === 0 ? (
            <p className="rounded-card border border-border bg-surface-raised p-8 text-center text-ink-muted">
              {souEu ? 'Você ainda não publicou nada.' : 'Nada publicado ainda.'}
            </p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : null}

        {aba === 'skills' ? (
          profile.skills.length === 0 ? (
            <p className="rounded-card border border-border bg-surface-raised p-8 text-center text-ink-muted">
              Nenhuma habilidade cadastrada.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2 rounded-card border border-border bg-surface-raised p-6">
              {profile.skills.map((skill) => (
                <li
                  key={skill.slug}
                  className="rounded-pill border border-border px-3 py-1.5 text-sm text-ink-muted"
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {aba === 'links' ? (
          profile.links.length === 0 ? (
            <p className="rounded-card border border-border bg-surface-raised p-8 text-center text-ink-muted">
              Nenhum link cadastrado.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 rounded-card border border-border bg-surface-raised p-4">
              {profile.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    // `noopener` fecha o acesso da página aberta ao `window` desta;
                    // `nofollow` evita que um perfil vire ferramenta de SEO alheio.
                    rel="noopener noreferrer nofollow"
                    className="block rounded-field px-3 py-2.5 text-sm font-medium text-ink underline transition-colors hover:bg-surface-subtle"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </>
  );
}
