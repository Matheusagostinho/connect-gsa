import { useEffect, useState } from 'react';
import { cn } from './ui.tsx';

/**
 * Avatar, com recuo para a inicial quando não há foto.
 *
 * `ring` mede em pixels de CSS e não escala com o tamanho, então um anel bonito
 * num avatar de 88px vira uma borda grossa demais num de 32. Daí a espessura
 * ser derivada do tamanho, com piso de 2px — abaixo disso o degradê some.
 */
export function Avatar({
  name,
  imageUrl,
  size = 44,
  className,
  /** Anel em degradê da marca. Para quando o avatar é o assunto da tela. */
  ring = false,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const espessura = Math.max(2, Math.round(size * 0.035));

  /**
   * Recuo para a inicial quando a foto não carrega.
   *
   * Sem isto, um arquivo que sumiu do armazenamento vira o ícone de imagem
   * quebrada do navegador — pior que não ter foto, porque parece defeito do
   * produto. O estado é zerado quando a URL muda, senão trocar de pessoa numa
   * lista herdaria a falha da anterior.
   */
  const [falhou, setFalhou] = useState(false);

  useEffect(() => setFalhou(false), [imageUrl]);

  const conteudo = imageUrl && !falhou ? (
    <img
      src={imageUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFalhou(true)}
      style={{ width: size, height: size }}
      className={cn(
        'shrink-0 rounded-full object-cover',
        ring ? 'border-0' : 'border border-border',
        className,
      )}
    />
  ) : (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        'spark-gradient flex shrink-0 items-center justify-center rounded-full font-medium text-white',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (!ring) return conteudo;

  return (
    // O anel é o degradê por baixo, com um vão da cor da superfície entre ele e
    // a foto. Um `border-image` circular não existe em CSS, e `outline` não
    // aceita gradiente — este é o caminho que funciona nos dois temas.
    <span
      className="spark-gradient inline-flex shrink-0 rounded-full"
      style={{ padding: espessura }}
    >
      <span className="inline-flex rounded-full bg-surface-raised" style={{ padding: espessura / 2 }}>
        {conteudo}
      </span>
    </span>
  );
}
