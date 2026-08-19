import { POST_LIMITS } from '@connect-gsa/shared';
import { ImagePlus, X } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { uploadPostImage, useCreatePost } from '../lib/feed.js';
import { Avatar } from './Avatar.tsx';
import { Button, cn } from './ui.tsx';

/**
 * Caixa de publicação.
 *
 * A imagem é enviada assim que escolhida, não junto do post: assim a pessoa vê
 * a prévia e o erro (arquivo grande, formato errado) antes de terminar de
 * escrever — e não perde o texto por causa de um upload recusado no fim.
 */
export function Composer({ authorName, authorImage }: { authorName: string; authorImage: string | null }) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<{ key: string; url: string } | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const publicar = useCreatePost();
  const restantes = POST_LIMITS.contentMax - content.length;

  async function escolherImagem(file: File) {
    setErro(null);
    setEnviandoImagem(true);
    try {
      setMedia(await uploadPostImage(file));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      setEnviandoImagem(false);
      // Zerar o input permite reescolher o MESMO arquivo depois de um erro.
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  }

  function enviar(event: FormEvent) {
    event.preventDefault();
    if (content.trim().length === 0) return;

    setErro(null);
    publicar.mutate(
      { content, ...(media ? { mediaKey: media.key } : {}) },
      {
        onSuccess: () => {
          setContent('');
          setMedia(null);
        },
        onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível publicar.'),
      },
    );
  }

  return (
    <div className="border-b border-border px-4 py-3 sm:px-5">
      <form onSubmit={enviar} className="flex gap-3">
        <Avatar name={authorName} imageUrl={authorImage} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <label htmlFor="composer" className="sr-only">
            O que você está construindo?
          </label>
          <textarea
            id="composer"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={POST_LIMITS.contentMax}
            rows={1}
            placeholder="O que você está construindo?"
            // Cresce com o texto em vez de reservar três linhas vazias: uma
            // caixa alta e sem moldura parece um buraco na página, e uma caixa
            // que não cresce esconde o que já foi escrito.
            onInput={(event) => {
              const campo = event.currentTarget;
              campo.style.height = 'auto';
              campo.style.height = `${campo.scrollHeight}px`;
            }}
            className={cn(
              'w-full resize-none bg-transparent py-2 text-lg text-ink outline-none',
              'max-h-72 overflow-y-auto placeholder:text-ink-muted',
            )}
          />

          {media ? (
            <div className="relative w-fit">
              <img
                src={media.url}
                alt="Imagem que você anexou"
                className="max-h-72 rounded-field border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setMedia(null)}
                aria-label="Remover imagem"
                className="absolute top-2 right-2 flex size-9 cursor-pointer items-center justify-center rounded-pill bg-ink/70 text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {erro ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {erro}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                ref={inputArquivo}
                type="file"
                accept="image/*"
                className="sr-only"
                id="imagem-do-post"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void escolherImagem(file);
                }}
              />
              <label
                htmlFor="imagem-do-post"
                className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill px-3 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                {enviandoImagem ? 'Enviando…' : 'Imagem'}
              </label>

              {restantes < 120 ? (
                <span
                  aria-live="polite"
                  className={restantes < 0 ? 'text-sm text-danger' : 'text-sm text-ink-muted'}
                >
                  {restantes}
                </span>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={content.trim().length === 0 || publicar.isPending || enviandoImagem}
            >
              {publicar.isPending ? 'Publicando…' : 'Publicar'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
