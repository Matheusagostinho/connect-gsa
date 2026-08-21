import { cn } from './ui.tsx';

/**
 * O contorno do conteúdo enquanto ele não chega.
 *
 * Por que não um "Carregando…": um texto centralizado some e é substituído por
 * uma tela cheia, e o salto move tudo o que a pessoa já estava olhando. O
 * contorno ocupa o espaço final desde o primeiro quadro, então a chegada do
 * conteúdo não empurra nada.
 *
 * ## Duas coisas que não são estilo
 *
 * **O brilho é `motion-safe`.** Quem pediu menos movimento recebe o bloco
 * parado, não a ausência dele — sumir com o contorno devolveria o salto que ele
 * existe para evitar.
 *
 * **Ele é invisível para leitor de tela** (`aria-hidden`). Quem navega por áudio
 * não se beneficia de um retângulo cinza; o que serve a essa pessoa é o
 * `aria-busy` na região e o anúncio quando o conteúdo chega. Ler "caixa vazia"
 * doze vezes é ruído, não informação.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-field bg-surface-subtle',
        'motion-safe:animate-[pulsa_1.6s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

/**
 * O contorno de uma publicação do feed.
 *
 * As medidas imitam o cartão real de propósito: avatar de 40px, duas linhas de
 * cabeçalho, três de texto. Um contorno que não tem a altura do conteúdo final
 * causa o mesmo salto que ele deveria evitar.
 */
export function PostSkeleton() {
  return (
    <article className="border-b border-border py-5">
      <div className="flex gap-3">
        <Skeleton className="size-10 shrink-0 rounded-pill" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />

          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>

          <div className="mt-5 flex gap-2">
            <Skeleton className="h-8 w-20 rounded-pill" />
            <Skeleton className="h-8 w-20 rounded-pill" />
          </div>
        </div>
      </div>
    </article>
  );
}

/** O contorno de um cartão de pessoa — diretório e coluna de sugestões. */
export function PersonSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="size-11 shrink-0 rounded-pill" />
      <div className="flex-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-52" />
      </div>
    </div>
  );
}

/**
 * Uma lista de contornos.
 *
 * `aria-busy` na região é o que conta para quem usa leitor de tela: ele diz que
 * ali está carregando, sem obrigar a pessoa a ouvir doze blocos vazios.
 */
export function SkeletonList({
  quantidade = 3,
  children,
  rotulo,
}: {
  quantidade?: number;
  children: () => React.ReactElement;
  rotulo: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" aria-label={rotulo}>
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i}>{children()}</div>
      ))}
    </div>
  );
}
