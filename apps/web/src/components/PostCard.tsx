import type { Comment, Post } from '@connect-gsa/shared';
import { useMutation } from '@tanstack/react-query';
import { Megaphone, MessageCircle, ShieldMinus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '../lib/api.js';
import { useDeletePost, useReact } from '../lib/feed.js';
import { Avatar } from './Avatar.tsx';
import { RichText } from './RichText.tsx';
import { ReactionBar } from './ReactionBar.tsx';
import { Button, Card, cn } from './ui.tsx';

/** "há 3 min", "há 2 h", "12 de ago" — sem biblioteca de datas para 20 linhas. */
function quandoFoi(iso: string): string {
  const minutos = Math.floor((Date.now() - Date.parse(iso)) / 60_000);

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 1440) return `há ${Math.floor(minutos / 60)} h`;
  if (minutos < 10080) return `há ${Math.floor(minutos / 1440)} d`;

  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export function PostCard({ post }: { post: Post }) {
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [comentarios, setComentarios] = useState<Comment[] | null>(null);
  const [rascunho, setRascunho] = useState('');

  const reagir = useReact(post.id);
  const apagar = useDeletePost();

  const carregar = useMutation({
    mutationFn: () => api.get<Comment[]>(`/posts/${post.id}/comments`),
    onSuccess: setComentarios,
  });

  const comentar = useMutation({
    mutationFn: (content: string) =>
      api.post<Comment[]>(`/posts/${post.id}/comments`, { content }),
    onSuccess: (lista) => {
      setComentarios(lista);
      setRascunho('');
    },
  });

  const apagarComentario = useMutation({
    mutationFn: (id: string) => api.remove(`/comments/${id}`),
    onSuccess: () => carregar.mutate(),
  });

  function alternarComentarios() {
    const abrindo = !comentariosAbertos;
    setComentariosAbertos(abrindo);
    if (abrindo && comentarios === null) carregar.mutate();
  }

  function enviarComentario(event: FormEvent) {
    event.preventDefault();
    if (rascunho.trim().length > 0) comentar.mutate(rascunho);
  }

  const totalComentarios = comentarios?.length ?? post.commentCount;

  return (
    <Card className={cn('p-5', post.kind === 'announcement' && 'border-border-strong')}>
      <article>
        {/*
          Comunicado oficial se identifica. Sem a marca, ele parece publicação
          pessoal de quem por acaso é da coordenação — e perde o peso que tem.
        */}
        {post.kind === 'announcement' ? (
          <p className="mb-4 flex items-center gap-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
            <Megaphone className="size-3.5" aria-hidden="true" />
            Aviso do programa
          </p>
        ) : null}

        <header className="flex items-start gap-3">
          <Avatar name={post.author.name} imageUrl={post.author.imageUrl} />

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{post.author.name}</p>
            <p className="truncate text-sm text-ink-muted">
              {[post.author.institutionAcronym, post.author.course].filter(Boolean).join(' · ')}
              {post.author.institutionAcronym || post.author.course ? ' · ' : ''}
              <time dateTime={post.createdAt}>{quandoFoi(post.createdAt)}</time>
            </p>
          </div>

          {post.canDelete ? (
            <button
              type="button"
              aria-label="Apagar minha publicação"
              disabled={apagar.isPending}
              onClick={() => apagar.mutate(post.id)}
              className="flex size-10 cursor-pointer items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}

          {/*
            Moderação usa ícone e confirmação diferentes de propósito. Com o
            mesmo botão de "apagar", a coordenação acha que está removendo o
            próprio conteúdo — e remove o de outra pessoa sem perceber.
          */}
          {post.canModerate ? (
            <button
              type="button"
              aria-label={`Remover a publicação de ${post.author.name} como moderação`}
              title="Remover como moderação"
              disabled={apagar.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Remover a publicação de ${post.author.name}? Esta ação é de moderação e não pode ser desfeita.`,
                  )
                ) {
                  apagar.mutate(post.id);
                }
              }}
              className="flex size-10 cursor-pointer items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:text-danger"
            >
              <ShieldMinus className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </header>

        {/*
          `break-words` não é detalhe: uma URL de busca do Google tem centenas
          de caracteres sem espaço, e sem isso ela estoura a largura do cartão.
        */}
        <p className="mt-4 text-base break-words whitespace-pre-wrap">
          <RichText text={post.content} />
        </p>

        {post.mediaUrl ? (
          <img
            src={post.mediaUrl}
            alt=""
            loading="lazy"
            className="mt-4 max-h-[32rem] w-full rounded-field border border-border object-cover"
          />
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ReactionBar
            counts={post.reactionCounts}
            mine={post.myReaction}
            disabled={reagir.isPending}
            onReact={(reaction) => reagir.mutate(reaction)}
          />

          <button
            type="button"
            onClick={alternarComentarios}
            aria-expanded={comentariosAbertos}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill px-3 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {totalComentarios > 0 ? totalComentarios : ''} Comentar
          </button>
        </div>

        {comentariosAbertos ? (
          <section className="mt-5 border-t border-border pt-5">
            <h3 className="sr-only">Comentários</h3>

            {carregar.isPending ? (
              <p className="text-sm text-ink-muted" role="status">
                Carregando…
              </p>
            ) : null}

            <ul className="flex flex-col gap-4">
              {comentarios?.map((comentario) => (
                <li key={comentario.id} className="flex gap-3">
                  <Avatar
                    name={comentario.author.name}
                    imageUrl={comentario.author.imageUrl}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{comentario.author.name}</span>{' '}
                      <span className="text-ink-muted">{quandoFoi(comentario.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">
                      <RichText text={comentario.content} />
                    </p>
                  </div>
                  {comentario.canDelete || comentario.canModerate ? (
                    <button
                      type="button"
                      aria-label={
                        comentario.canDelete
                          ? 'Apagar meu comentário'
                          : `Remover o comentário de ${comentario.author.name} como moderação`
                      }
                      onClick={() => apagarComentario.mutate(comentario.id)}
                      className="cursor-pointer text-ink-muted transition-colors duration-200 hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            <form onSubmit={enviarComentario} className="mt-4 flex gap-2">
              <label htmlFor={`comentario-${post.id}`} className="sr-only">
                Escreva um comentário
              </label>
              <input
                id={`comentario-${post.id}`}
                value={rascunho}
                onChange={(event) => setRascunho(event.target.value)}
                placeholder="Escreva um comentário"
                maxLength={500}
                className="min-h-11 flex-1 rounded-pill border border-border bg-surface px-4 text-sm outline-none placeholder:text-ink-muted"
              />
              <Button
                type="submit"
                disabled={rascunho.trim().length === 0 || comentar.isPending}
                className="px-5"
              >
                Enviar
              </Button>
            </form>
          </section>
        ) : null}
      </article>
    </Card>
  );
}
