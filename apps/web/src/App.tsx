import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast.tsx';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { useMyProfile } from './lib/session.js';
import { InvitePage } from './pages/Invite.tsx';
import { LoginPage } from './pages/Login.tsx';
import { OnboardingPage } from './pages/Onboarding.tsx';
import { AnnouncementsPage } from './pages/Announcements.tsx';
import { ConnectionsPage } from './pages/Connections.tsx';
import { DevLoginPage } from './pages/DevLogin.tsx';
import { DirectoryPage } from './pages/Directory.tsx';
import { FeedPage } from './pages/Feed.tsx';
import { LandingPage } from './pages/Landing.tsx';
import { SettingsPage } from './pages/Settings.tsx';
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

/**
 * A raiz do aplicativo.
 *
 * Enquanto a sessão é verificada não mostramos nem uma coisa nem outra: piscar
 * a apresentação para quem já está autenticado é pior do que esperar um quadro.
 */
function Raiz() {
  const { data: profile, isPending } = useMyProfile();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" role="status">
        <span className="text-ink-muted">Carregando…</span>
      </div>
    );
  }

  return profile ? <FeedPage /> : <LandingPage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/*
        O provedor de avisos envolve o roteador, e não o contrário: um aviso
        disparado durante uma navegação precisa sobreviver à troca de tela.
      */}
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/*
              Duas rotas para a mesma tela. `/convite/CODIGO` é a forma nova, que
              se lê e se dita; `/convite` sem código continua existindo para quem
              digita o código à mão, e o `?c=` antigo é lido pela própria página —
              um endereço que já circulou não pode deixar de funcionar.
            */}
            <Route path="/convite" element={<InvitePage />} />
            <Route path="/convite/:code" element={<InvitePage />} />
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
            {/*
              A raiz decide pelo estado da sessão: quem não entrou vê a
              apresentação, quem entrou vê o feed. Duas URLs para a mesma porta de
              entrada dividiria os links compartilhados sem ganho nenhum.
            */}
            <Route path="/" element={<Raiz />} />
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
              path="/avisos"
              element={
                <ProtectedRoute>
                  <AnnouncementsPage />
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
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            {/* Endereço público e estável de um perfil — o que circula em conversa. */}
            <Route
              path="/perfil/:slug"
              element={
                <ProtectedRoute>
                  <PublicProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
