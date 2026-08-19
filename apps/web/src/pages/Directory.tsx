import { ListFilter, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AmbassadorCardItem } from '../components/AmbassadorCardItem.tsx';
import { AppShell } from '../components/AppShell.tsx';
import { SkillFilterPanel } from '../components/SkillFilterPanel.tsx';
import { Button, cn } from '../components/ui.tsx';
import { useDirectory, useSkills, type DirectoryFilters } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

export function DirectoryPage() {
  const { data: profile } = useMyProfile();
  const { data: skills = [] } = useSkills();

  const [termo, setTermo] = useState('');
  const [filtros, setFiltros] = useState<DirectoryFilters>({});
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const campoBusca = useRef<HTMLInputElement>(null);

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

  const nomeDaHabilidade = skills.find((s) => s.slug === habilidadeAtiva)?.name;

  return (
    <AppShell
      profile={profile}
      title="Quem está na rede"
      lead={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setBuscaAberta((estava) => !estava);
              // O foco vai para o campo no mesmo gesto que o abre: abrir uma
              // busca e ainda exigir um toque para digitar é meio caminho.
              requestAnimationFrame(() => campoBusca.current?.focus());
            }}
            aria-expanded={buscaAberta}
            aria-label="Buscar embaixadores"
            className={cn(
              'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill',
              'transition-colors duration-200',
              buscaAberta ? 'bg-surface-subtle text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setFiltrosAbertos(true)}
            aria-label={
              nomeDaHabilidade ? `Filtros, filtrando por ${nomeDaHabilidade}` : 'Filtros'
            }
            className={cn(
              'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill',
              'transition-colors duration-200',
              habilidadeAtiva ? 'bg-surface-subtle text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <ListFilter className="size-5" aria-hidden="true" />
            {habilidadeAtiva ? (
              <span
                aria-hidden="true"
                className="spark-gradient absolute top-1.5 right-1.5 size-2 rounded-pill"
              />
            ) : null}
          </button>
        </div>
      }
    >
      {buscaAberta ? (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <label htmlFor="busca" className="sr-only">
            Buscar por nome, curso ou instituição
          </label>
          <input
            ref={campoBusca}
            id="busca"
            type="search"
            value={termo}
            placeholder="Nome, curso ou instituição"
            onChange={(event) => setTermo(event.target.value)}
            className="w-full bg-transparent py-1 text-lg text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
      ) : null}

      {habilidadeAtiva ? (
        <div className="px-4 pt-4 sm:px-5">
          <button
            type="button"
            onClick={() => setFiltros(({ skill: _ignorada, ...resto }) => resto)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-pill bg-action px-3 text-sm font-medium text-on-action"
          >
            {nomeDaHabilidade ?? habilidadeAtiva}
            <X className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Tirar este filtro</span>
          </button>
        </div>
      ) : null}

      <SkillFilterPanel
        aberto={filtrosAbertos}
        skills={skills}
        selecionada={habilidadeAtiva}
        onSelect={(slug) =>
          setFiltros(({ skill: _ignorada, ...resto }) => (slug ? { ...resto, skill: slug } : resto))
        }
        onClose={() => setFiltrosAbertos(false)}
      />

      {isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Buscando…
        </p>
      ) : null}

      {!isPending && pessoas.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <Search className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
          <h2 className="display mt-3 text-2xl">Ninguém por aqui</h2>
          <p className="mt-2 text-ink-muted">Tente outro termo ou tire os filtros.</p>
        </div>
      ) : null}

      <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {pessoas.map((pessoa) => (
          <li key={pessoa.id}>
            <AmbassadorCardItem person={pessoa} />
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <Button
          variant="outline"
          className="mx-auto mb-6"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
        </Button>
      ) : null}
    </AppShell>
  );
}
