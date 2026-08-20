import type { MyProfile } from '@connect-gsa/shared';
import { DELETE_CONFIRMATION } from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { GitHubMark } from '../components/BrandMarks.tsx';
import { InviteShare } from '../components/InviteShare.tsx';
import { REPOSITORIO } from '../lib/projeto.js';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Button, Card, Field } from '../components/ui.tsx';
import { useDeleteAccount, useExportData } from '../lib/account.js';
import { api } from '../lib/api.js';
import { useMyProfile } from '../lib/session.js';

/**
 * Configurações.
 *
 * Reúne o que antes estava espalhado — privacidade no perfil, tema no menu da
 * conta — e acrescenta os direitos do titular sobre os próprios dados.
 *
 * A exclusão fica por último, separada por uma borda vermelha e exigindo que a
 * pessoa digite a confirmação. É irreversível: um botão sozinho, no meio da
 * página, é toque errado esperando acontecer.
 */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();
  const [confirmacao, setConfirmacao] = useState('');

  const exportar = useExportData();
  const excluir = useDeleteAccount();

  const privacidade = useMutation({
    mutationFn: (visibleOnMap: boolean) => api.patch<MyProfile>('/me/privacy', { visibleOnMap }),
    onSuccess: (atualizado) => queryClient.setQueryData(['me'], atualizado),
  });

  if (!profile) return null;

  return (
    <AppShell profile={profile} title="Configurações">

      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-xl font-medium">Aparência</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-ink-muted">
              Claro, escuro ou acompanhando o seu sistema.
            </span>
            <ThemeToggle />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-medium">Privacidade</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Se você aparecer no mapa, os outros embaixadores veem a sua cidade — nunca um
            endereço. Guardamos apenas o município, jamais a localização do seu aparelho.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-medium">
              {profile.visibleOnMap ? 'Você aparece no mapa' : 'Você não aparece no mapa'}
            </span>
            <Button
              variant={profile.visibleOnMap ? 'outline' : 'primary'}
              disabled={privacidade.isPending}
              aria-pressed={profile.visibleOnMap}
              onClick={() => privacidade.mutate(!profile.visibleOnMap)}
            >
              {privacidade.isPending
                ? 'Salvando…'
                : profile.visibleOnMap
                  ? 'Sair do mapa'
                  : 'Aparecer no mapa'}
            </Button>
          </div>
        </Card>

        {/*
          Convidar deixou de ser privilégio da coordenação: quem conhece outro
          participante do programa é quem está NELE. O que segura o portão passou
          a ser o teto por período, verificado no servidor.
        */}
        <InviteShare />

        {/*
          O mesmo link da coluna de navegação, repetido aqui porque no celular
          essa coluna não existe — e quem usa o produto no celular é quem mais
          precisa achar um caminho para o código.
        */}
        <Card>
          <h2 className="text-xl font-medium">Contribua com o projeto</h2>
          <p className="mt-2 text-sm text-ink-muted">
            O ConnectGSA é feito por embaixadores, no aberto. Sugestões, correções e ideias são
            bem-vindas.
          </p>
          <a
            href={REPOSITORIO}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-border-strong px-5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
          >
            <GitHubMark />
            Ver no GitHub
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </Card>

        <Card>
          <h2 className="text-xl font-medium">Seus dados</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Baixe tudo o que a rede sabe sobre você, num arquivo que outro programa consegue
            ler: perfil, publicações, comentários, reações e conexões.
          </p>

          <Button className="mt-5" disabled={exportar.isPending} onClick={() => exportar.mutate()}>
            <Download className="size-4" aria-hidden="true" />
            {exportar.isPending ? 'Preparando…' : 'Baixar meus dados'}
          </Button>

          {exportar.error instanceof Error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {exportar.error.message}
            </p>
          ) : null}
        </Card>

        <Card className="border-danger/40">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-1 size-5 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-medium">Excluir minha conta</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Apaga a sua conta, as suas publicações, comentários, reações, conexões e as
                imagens que você enviou. <strong className="text-ink">Não dá para desfazer.</strong>
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Field
                  id="confirmacao"
                  label={`Digite ${DELETE_CONFIRMATION} para confirmar`}
                  value={confirmacao}
                  autoComplete="off"
                  onChange={(event) => setConfirmacao(event.target.value)}
                  {...(excluir.error instanceof Error ? { error: excluir.error.message } : {})}
                />

                <Button
                  variant="outline"
                  className="self-start border-danger text-danger hover:bg-danger/10"
                  disabled={confirmacao !== DELETE_CONFIRMATION || excluir.isPending}
                  onClick={() => excluir.mutate(confirmacao)}
                >
                  {excluir.isPending ? 'Excluindo…' : 'Excluir minha conta'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
