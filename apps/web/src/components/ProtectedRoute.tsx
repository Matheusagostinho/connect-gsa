import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMyProfile } from '../lib/session.js';

/**
 * Porta de entrada das telas internas (AC-009).
 *
 * Duas passagens, nesta ordem: sem sessão vai para o login; com sessão mas com
 * perfil incompleto vai para o onboarding. É por isso que o embaixador recém
 * chegado não consegue circular pela rede antes de se apresentar.
 *
 * Isto é experiência de uso, não segurança. Quem forjar a navegação encontra a
 * mesma recusa no servidor (P-004) — aqui só evitamos mostrar uma tela vazia.
 */
export function ProtectedRoute({
  children,
  requireCompleteProfile = true,
}: {
  children: ReactElement;
  requireCompleteProfile?: boolean;
}): ReactElement {
  const { data: profile, isPending } = useMyProfile();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" role="status" aria-live="polite">
        <span className="text-ink-muted">Carregando…</span>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }

  if (requireCompleteProfile && !profile.profileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
