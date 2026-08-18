import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { cn } from './ui.tsx';

/**
 * Seleção de item a partir de busca no servidor.
 *
 * São 5.571 municípios: mandar a lista inteira ao navegador desperdiçaria
 * megabytes de transferência — que, no plano gratuito do Firebase Hosting, é
 * justamente o recurso escasso. A busca só dispara com 2+ caracteres e depois
 * de uma pausa na digitação.
 */
export function Autocomplete<T extends { id: string }>({
  id,
  label,
  endpoint,
  render,
  value,
  onSelect,
  error,
}: {
  id: string;
  label: string;
  endpoint: '/cities' | '/institutions';
  render: (item: T) => string;
  value: T | null;
  onSelect: (item: T | null) => void;
  error?: string;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const { data: options = [], isFetching } = useQuery({
    queryKey: [endpoint, debounced],
    enabled: debounced.trim().length >= 2 && value === null,
    queryFn: () => api.get<T[]>(`${endpoint}?q=${encodeURIComponent(debounced.trim())}`),
  });

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-card px-3">
          <span className="text-base">{render(value)}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTerm('');
            }}
            className="cursor-pointer text-sm font-semibold text-primary underline"
          >
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        autoComplete="off"
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={`${id}-opcoes`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={cn(
          'min-h-11 rounded-lg border bg-card px-3 text-base',
          error ? 'border-destructive' : 'border-border',
        )}
        placeholder="Digite ao menos 2 letras"
      />

      {isFetching ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Buscando…
        </p>
      ) : null}

      {options.length > 0 ? (
        <ul id={`${id}-opcoes`} className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onSelect(option)}
                className="w-full cursor-pointer px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-muted"
              >
                {render(option)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
