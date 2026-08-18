import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { InvitePage } from './pages/Invite.tsx';
import { LoginPage } from './pages/Login.tsx';
import { OnboardingPage } from './pages/Onboarding.tsx';
import { ProfilePage } from './pages/Profile.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // O foco voltar à aba não é motivo para refazer toda consulta: no plano
      // gratuito, requisição à toa é cota queimada sem nada em troca.
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/convite" element={<InvitePage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireCompleteProfile={false}>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/perfil" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
