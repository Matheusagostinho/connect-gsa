import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { InvitePage } from './pages/Invite.tsx';
import { LoginPage } from './pages/Login.tsx';
import { OnboardingPage } from './pages/Onboarding.tsx';
import { ConnectionsPage } from './pages/Connections.tsx';
import { DevLoginPage } from './pages/DevLogin.tsx';
import { DirectoryPage } from './pages/Directory.tsx';
import { FeedPage } from './pages/Feed.tsx';
import { NotificationsPage } from './pages/Notifications.tsx';

import { PublicProfilePage } from './pages/PublicProfile.tsx';
import { ProfilePage } from './pages/Profile.tsx';

/**
 * O mapa é carregado sob demanda.
 *
 * O MapLibre sozinho pesa mais que todo o resto do aplicativo junto. Deixá-lo
 * no pacote principal faria quem só abre o feed baixar um motor de mapa que
 * nunca vai usar — e o plano gratuito do Firebase Hosting cobra isso em
 * transferência diária, com o site saindo do ar ao estourar.
 */
const MapPage = lazy(() =>
  import('./pages/MapPage.tsx').then((modulo) => ({ default: modulo.MapPage })),
);

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
          <Route
            path="/diretorio"
            element={
              <ProtectedRoute>
                <DirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mapa"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <p className="p-10 text-center text-ink-muted" role="status">
                      Carregando o mapa…
                    </p>
                  }
                >
                  <MapPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notificacoes"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conexoes"
            element={
              <ProtectedRoute>
                <ConnectionsPage />
              </ProtectedRoute>
            }
          />
          {/* Endereço público e estável de um perfil — o que circula em conversa. */}
          <Route
            path="/e/:slug"
            element={
              <ProtectedRoute>
                <PublicProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
