import type { MyProfile, PublicProfile } from '@connect-gsa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileView } from './ProfileView.tsx';

const BASE: PublicProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'ana-ribeiro',
  name: 'Ana Ribeiro',
  imageUrl: null,
  role: 'ambassador',
  course: 'Ciência da Computação',
  bio: 'Coordeno o capítulo.',
  skills: [{ slug: 'react', name: 'React', category: 'Tecnologia' }],
  links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/ana' }],
  institution: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Universidade Federal de Pernambuco',
    campus: '',
    acronym: 'UFPE',
  },
  city: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Recife',
    state: 'PE',
    latitude: -8,
    longitude: -34,
  },
  visibleOnMap: true,
  profileComplete: true,
  createdAt: '2026-08-01T12:00:00.000Z',
  connection: 'none',
  connectionCount: 4,
  postCount: 2,
};

const POSTS = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    kind: 'feed' as const,
    content: 'Terminei o protótipo do app',
    mediaUrl: null,
    createdAt: new Date().toISOString(),
    author: {
      id: BASE.id,
      slug: BASE.slug,
      name: BASE.name,
      imageUrl: null,
      course: BASE.course,
      institutionAcronym: 'UFPE',
      connection: 'none' as const,
    },
    reactionCounts: {},
    myReaction: null,
    commentCount: 0,
    canDelete: false,
    canModerate: false,
  },
];

function renderPerfil(profile: PublicProfile | MyProfile = BASE, eu?: MyProfile) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(POSTS) }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfileView profile={profile} {...(eu ? { eu } : {})} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apresentação do perfil', () => {
  it('mostra as publicações da pessoa @spec:AC-108', async () => {
    renderPerfil();

    expect(await screen.findByText('Terminei o protótipo do app')).toBeInTheDocument();
  });

  it('mostra as publicações também no meu próprio perfil @spec:AC-108', async () => {
    const eu = { ...BASE, connection: 'self' as const } as MyProfile;
    renderPerfil(eu, eu);

    // O perfil próprio não mostrava publicação nenhuma — era o único lugar da
    // rede onde a pessoa não via o que ela mesma tinha escrito.
    expect(await screen.findByText('Terminei o protótipo do app')).toBeInTheDocument();
  });

  it('mostra conexões e publicações em número @spec:AC-109', () => {
    renderPerfil();

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/conexões/)).toBeInTheDocument();
    expect(screen.getByText(/publicações/)).toBeInTheDocument();
  });

  it('o mesmo componente serve os dois perfis; só a ação muda @spec:AC-110', () => {
    const { unmount } = { unmount: () => {} };
    renderPerfil();

    // Perfil de terceiro: oferece conexão, não oferece edição.
    expect(screen.getByRole('button', { name: 'Conectar' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar perfil' })).not.toBeInTheDocument();
    unmount();
  });

  it('o próprio perfil oferece edição, não conexão @spec:AC-110', () => {
    const eu = { ...BASE, connection: 'self' as const } as MyProfile;
    renderPerfil(eu, eu);

    expect(screen.getByRole('link', { name: 'Editar perfil' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar' })).not.toBeInTheDocument();
  });

  it('troca de aba sem trocar de página', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await user.click(screen.getByRole('tab', { name: /habilidades/i }));

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByText('Terminei o protótipo do app')).not.toBeInTheDocument();
  });

  it('abre link externo sem entregar o controle da aba de origem', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await user.click(screen.getByRole('tab', { name: /links/i }));

    const link = screen.getByRole('link', { name: 'LinkedIn' });
    // Sem `noopener`, a página aberta consegue redirecionar esta pelo
    // `window.opener` — e um perfil é justamente onde entra link de estranho.
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'));
  });

  it('mostra o mês de entrada, e não uma data crua', () => {
    renderPerfil();

    expect(screen.getByText(/entrou em agosto de 2026/i)).toBeInTheDocument();
  });

  it('o contador de conexões é um link, e se anuncia como tal @spec:AC-122', () => {
    renderPerfil();

    // Conexões saiu da navegação: este é o ÚNICO caminho até a lista, e um
    // número que não parece clicável esconde a página inteira.
    const link = screen.getByRole('link', { name: /conex/i });
    expect(link).toHaveAttribute('href', '/conexoes');
  });

  it('oferece compartilhar o endereço do perfil @spec:AC-123', () => {
    renderPerfil();

    expect(screen.getByRole('button', { name: /compartilhar/i })).toBeInTheDocument();
  });

  it('não desenha capa nenhuma', () => {
    renderPerfil();

    // A faixa gerada ocupava um terço da tela do celular antes de a pessoa
    // aparecer — enfeite no lugar do que faz alguém decidir se quer se conectar.
    expect(document.querySelector('[style*="gradient"]')).toBeNull();
  });
});
