import { useState } from 'react';
import { NavLink } from 'react-router';
import { AccountMenu } from '../components/AccountMenu.tsx';
import { AmbassadorMap } from '../components/AmbassadorMap.tsx';
import { BottomNav } from '../components/BottomNav.tsx';
import { CityModal } from '../components/CityModal.tsx';
import { Wordmark } from '../components/Logo.tsx';
import { NotificationBell } from '../components/NotificationBell.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { useMap } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

/**
 * O mapa, em tela cheia.
 *
 * Esta é a única tela que não usa a moldura padrão. O mapa é o conteúdo, não um
 * elemento dentro de uma coluna de leitura — colocá-lo numa caixa desperdiçaria
 * justamente o que faz um mapa útil, que é enxergar o todo.
 *
 * No celular ele vira o FUNDO: a marca, as notificações e a conta flutuam por
 * cima, e a lista de uma cidade sobe em modal. Numa tela de 390px, qualquer
 * cabeçalho fixo come um quinto do mapa.
 */
export function MapPage() {
  const { data: profile } = useMyProfile();
  const { data: cities = [], isPending } = useMap();
  const [cidadeAberta, setCidadeAberta] = useState<string | null>(null);

  if (!profile) return null;

  const cidade = cities.find((c) => c.cityId === cidadeAberta) ?? null;
  const total = cities.reduce((soma, c) => soma + c.count, 0);

  return (
    <div className="fixed inset-0 flex bg-surface">
      {/* No computador a navegação continua sendo uma coluna, ao lado do mapa. */}
      <div className="hidden shrink-0 px-8 lg:block">
        <SideNav />
      </div>

      <div className="relative min-w-0 flex-1">
        <AmbassadorMap cities={cities} onSelectCity={setCidadeAberta} />

        {/*
          Flutuando sobre o mapa. `pointer-events-none` no contêiner e `auto`
          nos controles: sem isso, a faixa transparente bloquearia o arraste do
          mapa na parte de cima da tela.
        */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="pointer-events-auto flex flex-col gap-1 rounded-card border border-border bg-surface/85 px-4 py-3 backdrop-blur-sm">
            <NavLink to="/" aria-label="ConnectGSA" className="lg:hidden">
              <Wordmark />
            </NavLink>
            <p className="text-sm font-medium text-ink max-lg:mt-1">
              {isPending
                ? 'Carregando o mapa…'
                : `${total} ${total === 1 ? 'embaixador' : 'embaixadores'} em ${cities.length} ${
                    cities.length === 1 ? 'cidade' : 'cidades'
                  }`}
            </p>
            <p className="text-xs text-ink-muted">Cidade, nunca endereço</p>
          </div>

          <div className="pointer-events-auto flex items-center gap-1 rounded-pill border border-border bg-surface/85 px-1 backdrop-blur-sm">
            <NotificationBell />
            <AccountMenu profile={profile} />
          </div>
        </div>

        {!isPending && cities.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto max-w-sm rounded-card border border-border bg-surface/95 p-6 text-center backdrop-blur-sm">
              <h2 className="display text-xl">Ninguém no mapa ainda</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Aparecer no mapa é escolha de cada pessoa. Você liga a sua em Configurações.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <CityModal city={cidade} onClose={() => setCidadeAberta(null)} />

      <BottomNav />
    </div>
  );
}
