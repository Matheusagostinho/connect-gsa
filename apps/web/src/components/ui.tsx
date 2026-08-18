import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: Parameters<typeof clsx>): string => twMerge(clsx(classes));

/**
 * Botão do sistema.
 *
 * `min-h-11` são os 44px de alvo mínimo de toque — abaixo disso, errar o clique
 * no celular deixa de ser exceção. `disabled` aparece desabilitado E bloqueia o
 * ponteiro, para o duplo envio não passar.
 */
export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'accent' }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4',
        'text-sm font-semibold transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-primary text-on-primary hover:bg-primary/90',
        variant === 'accent' && 'bg-accent text-on-accent hover:bg-accent/90',
        variant === 'ghost' && 'border border-border bg-card text-foreground hover:bg-muted',
        className,
      )}
    />
  );
}

/**
 * Campo de formulário com rótulo VISÍVEL.
 *
 * O rótulo não vira placeholder: placeholder some quando a pessoa começa a
 * digitar, e quem foi interrompido no meio perde a referência do que era aquele
 * campo. O erro fica junto do campo, não num resumo no topo.
 */
export function Field({
  label,
  error,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const describedBy = [error ? `${id}-erro` : null, hint ? `${id}-dica` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy.length > 0 ? describedBy : undefined}
        className={cn(
          'min-h-11 rounded-lg border bg-card px-3 text-base text-foreground',
          'placeholder:text-muted-foreground',
          error ? 'border-destructive' : 'border-border',
        )}
      />
      {hint ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[--radius-card] border border-border bg-card p-6 text-card-foreground shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
