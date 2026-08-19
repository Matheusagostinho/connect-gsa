import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AmbassadorCardItem } from '../components/AmbassadorCardItem.tsx';
import { AppNav } from '../components/AppNav.tsx';
import { Button, Card, Field, Shell, cn } from '../components/ui.tsx';
import { useDirectory, useSkills, type DirectoryFilters } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

export function DirectoryPage() {
  const { data: profile } = useMyProfile();
  const { data: skills = [] } = useSkills();

  const [termo, setTermo] = useState('');
  const [filtros, setFiltros] = useState<DirectoryFilters>({});

  // Espera a digitação parar antes de buscar: sem isso, cada tecla vira uma
  // requisição e o limite de taxa da rota fecha na cara de quem digita rápido.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(({ q: _ignorado, ...resto }) => {
        const busca = termo.trim();
        // A chave é REMOVIDA quando vazia, não zerada: o objeto de filtros vira
        // chave de cache, e `{ q: undefined }` e `{}` não são o mesmo cache.
        return busca ? { ...resto, q: busca } : resto;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [termo]);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useDirectory(filtros);

  if (!profile) return null;

  const pessoas = data?.pages.flatMap((p) => p.people) ?? [];
  const habilidadeAtiva = filtros.skill;

  return (
    <Shell width="xl">
      <AppNav profile={profile} />

      <h1 className="display mb-2 text-3xl sm:text-4xl">Quem está na rede</h1>
      <p className="mb-6 text-base text-ink-muted">
        Procure por nome, curso, instituição — ou filtre por habilidade.
      </p>

      <div className="mb-4">
        <Field
          id="busca"
          label="Buscar"
          value={termo}
          placeholder="Nome, curso ou instituição"
          onChange={(event) => setTermo(event.target.value)}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {habilidadeAtiva ? (
          <button
            type="button"
            onClick={() => setFiltros(({ skill: _ignorada, ...resto }) => resto)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-pill bg-action px-3 text-sm font-medium text-on-action"
          >
            {skills.find((s) => s.slug === habilidadeAtiva)?.name ?? habilidadeAtiva}
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          skills.slice(0, 14).map((skill) => (
            <button
              key={skill.slug}
              type="button"
              onClick={() => setFiltros((f) => ({ ...f, skill: skill.slug }))}
              className={cn(
                'inline-flex min-h-9 cursor-pointer items-center rounded-pill border border-border px-3',
                'text-sm text-ink-muted transition-colors duration-200 hover:text-ink',
              )}
            >
              {skill.name}
            </button>
          ))
        )}
      </div>

      {isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Buscando…
        </p>
      ) : null}

      {!isPending && pessoas.length === 0 ? (
        <Card className="text-center">
          <Search className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
          <h2 className="display mt-3 text-2xl">Ninguém por aqui</h2>
          <p className="mt-2 text-ink-muted">Tente outro termo ou tire os filtros.</p>
        </Card>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {pessoas.map((pessoa) => (
          <li key={pessoa.id}>
            <AmbassadorCardItem person={pessoa} />
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <Button
          variant="outline"
          className="mx-auto mt-6"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
        </Button>
      ) : null}
    </Shell>
  );
}
