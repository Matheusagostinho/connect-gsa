import { cn } from './ui.tsx';

/** Avatar com recuo para inicial quando não há foto. */
export function Avatar({
  name,
  imageUrl,
  size = 44,
  className,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className={cn('shrink-0 rounded-full border border-border object-cover', className)}
      />
    );
  }

  return (
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
}
