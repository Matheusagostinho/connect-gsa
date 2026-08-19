import {
  Compass,
  Map,
  Megaphone,
  Newspaper,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface Destino {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Mostra o contador de notificações não lidas. */
  badge?: boolean;
  /** Aparece na barra inferior do celular. */
  mobile: boolean;
}

/**
 * Os destinos da rede, em um lugar só.
 *
 * A barra lateral e a barra inferior leem a mesma lista — se um destino
 * aparecesse só numa delas, ele existiria no computador e sumiria no celular
 * sem ninguém perceber.
 *
 * `mobile` marca os que cabem na barra inferior. Notificações não entra ali
 * porque no celular ela mora no topo, junto do perfil.
 *
 * **Conexões não está aqui de propósito.** Ela não é uma seção da rede: é uma
 * lista que pertence ao seu perfil, e o contador de conexões de lá é o caminho
 * até ela. Navegação que cresce com tudo que existe para de orientar.
 */
export const DESTINOS: readonly Destino[] = [
  { to: '/', label: 'Início', Icon: Newspaper, mobile: true },
  { to: '/diretorio', label: 'Diretório', Icon: Compass, mobile: true },
  { to: '/mapa', label: 'Mapa', Icon: Map, mobile: true },
  { to: '/avisos', label: 'Avisos', Icon: Megaphone, mobile: false },
  { to: '/perfil', label: 'Perfil', Icon: User, mobile: true },
  { to: '/configuracoes', label: 'Configurações', Icon: Settings, mobile: false },
];
