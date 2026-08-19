import { AppShell } from '../components/AppShell.tsx';
import { ProfileView } from '../components/ProfileView.tsx';
import { useMyProfile } from '../lib/session.js';

/**
 * O próprio perfil (US-004, US-005).
 *
 * A apresentação vem de `ProfileView`, o mesmo componente que desenha o perfil
 * de qualquer outra pessoa. Antes eram dois arquivos com o mesmo bloco copiado,
 * e eles já tinham divergido — o público mostrava campus e links, este não, sem
 * que ninguém tivesse decidido isso.
 *
 * O cabeçalho não leva título: o nome e a contagem de publicações aparecem logo
 * abaixo, no próprio perfil, e repeti-los a três centímetros de distância só
 * ocupava uma faixa da tela dizendo o que já estava dito.
 */
export function ProfilePage() {
  const { data: profile } = useMyProfile();

  if (!profile) return null;

  return (
    <AppShell profile={profile}>
      <ProfileView profile={profile} eu={profile} />
    </AppShell>
  );
}
