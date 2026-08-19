import { PROFILE_LIMITS, type Skill } from '@connect-gsa/shared';
import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSkills } from '../lib/directory.js';
import { cn } from './ui.tsx';

/**
 * Escolha de habilidades a partir do catálogo.
 *
 * Não é campo de texto de propósito. Texto livre parecia mais flexível e
 * destruía a busca: "React", "react" e "ReactJS" nunca se cruzavam, então
 * filtrar o diretório por habilidade não encontrava ninguém (AC-044).
 */
export function SkillPicker({
  selected,
  onChange,
  error,
}: {
  selected: string[];
  onChange: (slugs: string[]) => void;
  error?: string;
}) {
  const { data: skills = [], isPending } = useSkills();
  const [busca, setBusca] = useState('');

  const porCategoria = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = termo
      ? skills.filter((s) => s.name.toLowerCase().includes(termo))
      : skills;

    const mapa = new Map<string, Skill[]>();
    for (const skill of filtradas) {
      mapa.set(skill.category, [...(mapa.get(skill.category) ?? []), skill]);
    }
    return [...mapa.entries()];
  }, [skills, busca]);

  const cheio = selected.length >= PROFILE_LIMITS.skillsMax;

  function alternar(slug: string) {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (!cheio) onChange([...selected, slug]);
  }

  const escolhidas = selected.flatMap((slug) => {
    const skill = skills.find((s) => s.slug === slug);
    return skill ? [skill] : [];
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">Habilidades</span>
        <span className="text-xs text-ink-muted">
          {selected.length} de {PROFILE_LIMITS.skillsMax}
        </span>
      </div>

      {escolhidas.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {escolhidas.map((skill) => (
            <li key={skill.slug}>
              <button
                type="button"
                onClick={() => alternar(skill.slug)}
                aria-label={`Remover ${skill.name}`}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-pill bg-action px-3 text-sm font-medium text-on-action"
              >
                {skill.name}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        type="search"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Procurar habilidade"
        aria-label="Procurar habilidade"
        className="min-h-11 rounded-field border border-border bg-surface px-4 text-base outline-none placeholder:text-ink-muted"
      />

      {isPending ? (
        <p className="text-sm text-ink-muted" role="status">
          Carregando catálogo…
        </p>
      ) : null}

      <div className="max-h-64 overflow-y-auto rounded-field border border-border p-3">
        {porCategoria.map(([categoria, lista]) => (
          <div key={categoria} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
              {categoria}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {lista.map((skill) => {
                const marcada = selected.includes(skill.slug);
                return (
                  <li key={skill.slug}>
                    <button
                      type="button"
                      onClick={() => alternar(skill.slug)}
                      aria-pressed={marcada}
                      disabled={!marcada && cheio}
                      className={cn(
                        'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-pill border px-3',
                        'text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40',
                        marcada
                          ? 'border-transparent bg-surface-subtle text-ink'
                          : 'border-border text-ink-muted hover:text-ink',
                      )}
                    >
                      {marcada ? <Check className="size-3.5" aria-hidden="true" /> : null}
                      {skill.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {porCategoria.length === 0 && !isPending ? (
          <p className="text-sm text-ink-muted">Nenhuma habilidade com esse nome.</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
