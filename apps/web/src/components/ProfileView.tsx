import type { MyProfile, PublicProfile } from '@connect-gsa/shared';
import { Check, ChevronRight, Clock, GraduationCap, MapPin, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Avatar.tsx';
import { AvatarUpload } from './AvatarUpload.tsx';
import { ShareProfile } from './ShareProfile.tsx';
import { PostCard } from './PostCard.tsx';
import { useAuthorPosts, useConnectionAction } from '../lib/directory.js';
import { Button, cn } from './ui.tsx';

const PAPEL: Partial<Record<string, string>> = {
  admin: 'Coordenação',
  moderator: 'Moderação',
};

type Aba = 'posts' | 'skills' | 'links';

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
      <section aria-label={`Perfil de ${profile.name}`} className="border-b border-border">
        <div className="px-4 pt-5 pb-4 sm:px-5">
          {/*
            Sem capa. Ela ocupava um terço da tela do celular antes de a pessoa
            aparecer, e uma faixa gerada não é informação — é enfeite ocupando o
            lugar do nome, da bio e das habilidades, que é o que faz alguém
            decidir se quer se conectar.
          */}
          {/*
            No celular o nome vem AO LADO do avatar; a partir de `sm` ele desce
            para baixo dele. Numa tela de 390px, avatar em cima e nome embaixo
            gastava duas faixas de altura para dizer uma coisa só, e empurrava a
            bio e as habilidades — que é o que a pessoa veio ler — para fora da
            primeira tela.
          */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 basis-full items-center gap-4 sm:basis-auto">
              {souEu ? (
                <AvatarUpload profile={eu} size={88} ring />
              ) : (
                <Avatar name={profile.name} imageUrl={profile.imageUrl} size={88} ring />
              )}

              <div className="min-w-0 sm:hidden">
                <h1 className="display truncate text-2xl">{profile.name}</h1>
                <p className="truncate text-sm text-ink-muted">@{profile.slug}</p>
                {papel ? (
                  <span className="mt-1 inline-block rounded-pill border border-border px-2 py-0.5 text-xs font-medium text-ink">
                    {papel}
                  </span>
                ) : null}
              </div>
            </div>

            {/*
              `basis-full` no celular: os botões ganham uma linha inteira, em vez
              de disputarem a primeira com o avatar e o nome. Disputando, o nome
              era espremido até a largura ZERO e os botões ficavam por cima dele
              — o `flex-wrap` distribui o que sobra, e o que sobrava era nada.
            */}
            <div className="flex basis-full flex-wrap gap-2 sm:basis-auto sm:pt-2">
              {/*
                Um link, não um botão com `onClick` que navega: editar o perfil
                é ir para outro endereço, e só o link dá o menu de contexto, o
                "abrir em nova aba" e o destino na barra de status.
              */}
              <ShareProfile slug={profile.slug} name={profile.name} />

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

          <div className="mt-3 max-sm:hidden">
            <h1 className="display text-3xl">{profile.name}</h1>
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
            <p className="mt-4 leading-relaxed break-words max-sm:mt-3">{profile.bio}</p>
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

          <p className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            {/*
              Sublinhado e com seta: sem eles o número parecia só um contador, e
              ninguém descobria que a lista de conexões existe — ainda mais agora
              que ela saiu da navegação e este é o ÚNICO caminho até lá.
            */}
            <Link
              to="/conexoes"
              className="group inline-flex items-center gap-1.5 rounded-field text-ink-muted underline decoration-border underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-ink"
            >
              <strong className="font-medium text-ink">{profile.connectionCount}</strong>
              {profile.connectionCount === 1 ? 'conexão' : 'conexões'}
              <ChevronRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
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
        <div role="tablist" aria-label="O que ver deste perfil" className="mt-4 flex border-t border-border">
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
                {/* Largura inteira, como no feed: com três abas, um traço curto
                    no centro lê como enfeite em vez de posição. */}
                {ativa ? (
                  <span
                    aria-hidden="true"
                    className="spark-gradient absolute inset-x-0 bottom-0 h-1 rounded-pill"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div>
        {aba === 'posts' ? (
          posts.length === 0 ? (
            <p className="px-5 py-12 text-center text-ink-muted">
              {souEu ? 'Você ainda não publicou nada.' : 'Nada publicado ainda.'}
            </p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : null}

        {aba === 'skills' ? (
          profile.skills.length === 0 ? (
            <p className="px-5 py-12 text-center text-ink-muted">Nenhuma habilidade cadastrada.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 p-5">
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
            <p className="px-5 py-12 text-center text-ink-muted">Nenhum link cadastrado.</p>
          ) : (
            <ul className="flex flex-col gap-1 p-4">
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
