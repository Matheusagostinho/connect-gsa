import { ProfileView } from '../components/ProfileView.tsx';
import { AppShell } from '../components/AppShell.tsx';
import { useMyProfile } from '../lib/session.js';

/**
 * O próprio perfil (US-004, US-005).
 *
 * A apresentação vem de `ProfileView`, o mesmo componente que desenha o perfil
 * de qualquer outra pessoa. Antes eram dois arquivos com o mesmo bloco copiado,
 * e eles já tinham divergido — o público mostrava campus e links, este não, sem
 * que ninguém tivesse decidido isso.
 */
export function ProfilePage() {
  const { data: profile } = useMyProfile();

  if (!profile) return null;

  return (
    <AppShell
      profile={profile}
      width="lg"
      title={profile.name}
      subtitle={`${profile.postCount} ${profile.postCount === 1 ? 'publicação' : 'publicações'}`}
    >
      <ProfileView profile={profile} eu={profile} />
    </AppShell>
  );
}
