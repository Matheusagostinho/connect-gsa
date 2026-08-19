import { useState } from 'react';
import { AmbassadorMap } from '../components/AmbassadorMap.tsx';
import { AppShell } from '../components/AppShell.tsx';
import { CityModal } from '../components/CityModal.tsx';
import { useMap } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

/**
 * O mapa, ocupando a altura útil da moldura.
 *
 * Esta tela usa o modo imersivo do `AppShell` — não uma moldura própria. Ela já
 * teve uma, com o próprio `SideNav` num contêiner sem a largura máxima das
 * outras telas, e a coluna de navegação saltava oitenta pixels ao trocar de
 * seção. A navegação é a mesma em toda parte porque é o MESMO componente, não
 * porque duas cópias por acaso combinam.
 *
 * O mapa é o conteúdo, não um elemento dentro de uma coluna de leitura: colocá-lo
 * numa caixa desperdiçaria justamente o que faz um mapa útil, que é enxergar o
 * todo. A lista de uma cidade abre em modal, com o mapa visível atrás.
 */
export function MapPage() {
  const { data: profile } = useMyProfile();
  const { data: cities = [], isPending } = useMap();
  const [cidadeAberta, setCidadeAberta] = useState<string | null>(null);

  if (!profile) return null;

  const cidade = cities.find((c) => c.cityId === cidadeAberta) ?? null;
  const total = cities.reduce((soma, c) => soma + c.count, 0);

  return (
    <AppShell
      profile={profile}
      variant="immersive"
      title="Mapa"
      subtitle={
        isPending
          ? 'Carregando…'
          : `${total} ${total === 1 ? 'embaixador' : 'embaixadores'} em ${cities.length} ${
              cities.length === 1 ? 'cidade' : 'cidades'
            } · cidade, nunca endereço`
      }
    >
      <div className="relative size-full">
        <AmbassadorMap cities={cities} onSelectCity={setCidadeAberta} />

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

        <CityModal city={cidade} onClose={() => setCidadeAberta(null)} />
      </div>
    </AppShell>
  );
}
