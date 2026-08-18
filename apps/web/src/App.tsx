import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { InvitePage } from './pages/Invite.tsx';
import { LoginPage } from './pages/Login.tsx';
import { OnboardingPage } from './pages/Onboarding.tsx';
import { DevLoginPage } from './pages/DevLogin.tsx';
import { FeedPage } from './pages/Feed.tsx';
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
          {/*
            Só existe quando a API expõe /dev/* — ou seja, fora de produção.
            A tela lida com a rota ausente mostrando o erro, sem quebrar.
          */}
          {import.meta.env.DEV ? <Route path="/dev" element={<DevLoginPage />} /> : null}
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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
