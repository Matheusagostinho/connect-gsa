import type { Institution } from '@connect-gsa/shared';
import { useState } from 'react';
import { useInstitutionSearch, useProposeInstitution } from '../lib/directory.js';
import { cn } from './ui.tsx';

/** Como a instituição aparece: "IFNMG — Pirapora", ou só o nome quando não há campus. */
export function institutionLabel(i: Institution): string {
  const base = i.acronym ? `${i.acronym} — ${i.name}` : i.name;
  return i.campus ? `${base} · ${i.campus}` : base;
}

/**
 * Escolha da instituição, no nível do CAMPUS.
 *
 * Duas coisas que a versão anterior não tinha e custavam caro: campus (quem
 * estuda no IFNMG em Pirapora não se encontrava, só achava a reitoria) e a
 * saída para quem não está na lista.
 *
 * Nenhuma lista de instituições do Brasil fica completa — perseguir o dataset
 * perfeito é trabalho sem fim. Deixar propor resolve de vez: a pessoa usa na
 * hora e a coordenação aprova depois.
 */
export function InstitutionPicker({
  value,
  onSelect,
  error,
}: {
  value: Institution | null;
  onSelect: (institution: Institution | null) => void;
  error?: string;
}) {
  const [termo, setTermo] = useState('');
  const [propondo, setPropondo] = useState(false);
  const [campus, setCampus] = useState('');

  const { data: opcoes = [], isFetching } = useInstitutionSearch(termo);
  const propor = useProposeInstitution();

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Instituição de ensino</span>
        <div className="flex min-h-12 items-center justify-between gap-3 rounded-field border border-border bg-surface px-4">
          <span className="min-w-0 truncate text-base">{institutionLabel(value)}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTermo('');
              setPropondo(false);
            }}
            className="shrink-0 cursor-pointer text-sm font-medium text-ink underline"
          >
            Trocar
          </button>
        </div>
        {value.pending ? (
          <p className="text-xs text-ink-muted">
            Aguardando aprovação da coordenação. Você já pode usá-la normalmente.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="instituicao" className="text-sm font-medium text-ink">
        Instituição de ensino
      </label>
      <input
        id="instituicao"
        value={termo}
        onChange={(event) => setTermo(event.target.value)}
        autoComplete="off"
        placeholder="Sigla, nome ou campus — ex.: IFNMG, Pirapora"
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-12 rounded-field border bg-surface px-4 text-base outline-none',
          'placeholder:text-ink-muted',
          error ? 'border-danger' : 'border-border',
        )}
      />

      {isFetching ? (
        <p className="text-xs text-ink-muted" aria-live="polite">
          Buscando…
        </p>
      ) : null}

      {opcoes.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto rounded-field border border-border bg-surface">
          {opcoes.map((opcao) => (
            <li key={opcao.id}>
              <button
                type="button"
                onClick={() => onSelect(opcao)}
                className="w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-subtle"
              >
                {institutionLabel(opcao)}
                {opcao.pending ? (
                  <span className="ml-2 text-xs text-ink-muted">(aguardando aprovação)</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {termo.trim().length >= 2 && opcoes.length === 0 && !isFetching ? (
        propondo ? (
          <div className="flex flex-col gap-2 rounded-field border border-border p-3">
            <p className="text-sm text-ink-muted">
              Vamos cadastrar <span className="font-medium text-ink">{termo.trim()}</span>. Tem
              campus?
            </p>
            <input
              value={campus}
              onChange={(event) => setCampus(event.target.value)}
              placeholder="Campus (opcional)"
              aria-label="Campus"
              className="min-h-11 rounded-field border border-border bg-surface px-4 text-base outline-none"
            />
            <button
              type="button"
              disabled={propor.isPending}
              onClick={() =>
                propor.mutate(
                  { name: termo.trim(), campus: campus.trim() },
                  { onSuccess: onSelect },
                )
              }
              className="min-h-11 cursor-pointer rounded-pill bg-action px-4 text-sm font-medium text-on-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              {propor.isPending ? 'Cadastrando…' : 'Cadastrar e usar'}
            </button>
            {propor.error instanceof Error ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {propor.error.message}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPropondo(true)}
            className="self-start cursor-pointer text-sm font-medium text-ink underline"
          >
            Não achei a minha instituição
          </button>
        )
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
