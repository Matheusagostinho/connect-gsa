import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: Parameters<typeof clsx>): string => twMerge(clsx(classes));

/**
 * Botão do sistema, em pílula sólida — a forma da referência.
 *
 * `min-h-11` são os 44px de alvo mínimo de toque: abaixo disso, errar o clique
 * no celular deixa de ser exceção. `disabled` aparece desabilitado E bloqueia o
 * ponteiro, para o duplo envio não passar.
 */
export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'quiet' }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill px-6',
        'text-sm font-medium transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-action text-on-action hover:bg-action-hover',
        variant === 'outline' &&
          'border border-border-strong bg-transparent text-ink hover:bg-surface-subtle',
        variant === 'quiet' && 'bg-transparent px-3 text-ink-muted hover:text-ink',
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
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const describedBy = [error ? `${id}-erro` : null, hint ? `${id}-dica` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy.length > 0 ? describedBy : undefined}
        className={cn(
          'min-h-12 rounded-field border bg-surface px-4 text-base text-ink',
          'transition-colors duration-200 placeholder:text-ink-muted',
          error ? 'border-danger' : 'border-border hover:border-border-strong',
          className,
        )}
      />
      {hint ? (
        <p id={`${id}-dica`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-xs font-medium text-danger">
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
        'rounded-card border border-border bg-surface-raised p-8 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Página centrada com a goteira generosa da referência. */
export function Shell({ children, width = 'md' }: { children: ReactNode; width?: 'md' | 'lg' }) {
  return (
    <div className="min-h-screen bg-surface px-5 py-10 sm:px-gutter">
      <div className={cn('mx-auto w-full', width === 'md' ? 'max-w-md' : 'max-w-2xl')}>
        {children}
      </div>
    </div>
  );
}

/**
 * A marca do ConnectGSA.
 *
 * As quatro cores aparecem em gradiente, como acento — não há logotipo do
 * Google aqui, nem tratamento que imite a marca dele. O projeto não é oficial.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span aria-hidden="true" className="spark-gradient size-2.5 self-center rounded-full" />
      <span className="text-base font-medium tracking-tight text-ink">ConnectGSA</span>
    </span>
  );
}

/** Aviso obrigatório enquanto não houver aval do programa (Q-003). */
export function UnofficialNotice({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-xs text-ink-muted', className)}>
      Projeto não oficial, sem afiliação com o Google.
    </p>
  );
}
