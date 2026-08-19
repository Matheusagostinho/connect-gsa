import { X } from 'lucide-react';
import { useState } from 'react';
import { AmbassadorCardItem } from '../components/AmbassadorCardItem.tsx';
import { AmbassadorMap } from '../components/AmbassadorMap.tsx';
import { AppShell, FullBleed } from '../components/AppShell.tsx';
import { Card } from '../components/ui.tsx';
import { useCityPeople, useMap } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

export function MapPage() {
  const { data: profile } = useMyProfile();
  const { data: cities = [], isPending } = useMap();
  const [cidadeAberta, setCidadeAberta] = useState<string | null>(null);
  const { data: pessoas = [], isPending: carregandoPessoas } = useCityPeople(cidadeAberta);

  if (!profile) return null;

  const cidade = cities.find((c) => c.cityId === cidadeAberta);
  const total = cities.reduce((soma, c) => soma + c.count, 0);

  return (
    <AppShell profile={profile} bleed>
      <FullBleed>
        <div className="px-5 pb-3 lg:px-8">
          <h1 className="display text-2xl sm:text-3xl">Onde estamos</h1>
          <p className="mt-1 text-sm text-ink-muted">
        {isPending
          ? 'Carregando o mapa…'
          : `${total} ${total === 1 ? 'embaixador' : 'embaixadores'} em ${cities.length} ${cities.length === 1 ? 'cidade' : 'cidades'}.`}{' '}
            O mapa mostra a cidade de cada pessoa — nunca um endereço.
          </p>
        </div>

        {/* O mapa toma toda a altura que sobra (AC-064). */}
        <div className="min-h-0 flex-1 overflow-hidden border-y border-border">
          <AmbassadorMap cities={cities} onSelectCity={setCidadeAberta} />
        </div>
      </FullBleed>

      {cidadeAberta ? (
        <section className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8" aria-live="polite">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-medium">
              {cidade ? `${cidade.city}/${cidade.state}` : 'Cidade'}
              {cidade ? (
                <span className="ml-2 text-base font-normal text-ink-muted">
                  {cidade.count} {cidade.count === 1 ? 'pessoa' : 'pessoas'}
                </span>
              ) : null}
            </h2>
            <button
              type="button"
              onClick={() => setCidadeAberta(null)}
              aria-label="Fechar a lista da cidade"
              className="flex size-10 cursor-pointer items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {carregandoPessoas ? (
            <p className="text-ink-muted" role="status">
              Carregando…
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {pessoas.map((pessoa) => (
                <li key={pessoa.id}>
                  <AmbassadorCardItem person={pessoa} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!isPending && cities.length === 0 ? (
        <Card className="mx-auto mt-6 max-w-md text-center">
          <h2 className="display text-2xl">Ninguém no mapa ainda</h2>
          <p className="mt-2 text-ink-muted">
            Aparecer no mapa é uma escolha de cada pessoa. Você pode ligar a sua em Meu perfil.
          </p>
        </Card>
      ) : null}
    </AppShell>
  );
}
