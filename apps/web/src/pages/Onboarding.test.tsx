import type { MyProfile } from '@connect-gsa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './Onboarding.tsx';

const PERFIL: MyProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'ana-ribeiro',
  name: 'Ana Ribeiro',
  imageUrl: null,
  role: 'ambassador',
  course: 'Ciência da Computação',
  bio: '',
  skills: [{ slug: 'react', name: 'React', category: 'Tecnologia' }],
  links: [{ label: 'GitHub', url: 'https://github.com/ana' }],
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
  visibleOnMap: false,
  profileComplete: false,
  createdAt: '2026-08-01T12:00:00.000Z',
  connection: 'self',
  connectionCount: 0,
  postCount: 0,
};

function renderOnboarding(profileComplete: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const caminho = String(url);
      if (caminho.includes('/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ...PERFIL, profileComplete }),
        });
      }
      if (caminho.includes('/skills')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([{ slug: 'react', name: 'React', category: 'Tecnologia' }]),
        });
      }
      if (caminho.includes('/institutions')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                id: '11111111-1111-4111-8111-111111111111',
                name: 'IFNMG',
                campus: 'Pirapora',
                acronym: 'IFNMG',
                status: 'approved',
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Avança do passo 1 para o 2.
 *
 * O `PERFIL` do teste já traz instituição, então o seletor está no estado
 * "escolhida" e não há busca a fazer — basta continuar. O botão valida a etapa
 * antes de passar: descobrir na última tela que faltou algo na primeira é o que
 * faz a pessoa abandonar o cadastro.
 */
async function avancarParaCidade() {
  await userEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
}

describe('formulário do perfil', () => {
  it('editar acontece dentro da moldura do aplicativo @spec:AC-106', async () => {
    renderOnboarding(true);

    expect(await screen.findAllByRole('navigation', { name: 'Seções' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('preenche instituição, cidade e habilidades ao editar', async () => {
    renderOnboarding(true);

    // Elas nunca eram semeadas: salvar a partir de "Editar perfil" era recusado
    // com "Escolha sua instituição" num perfil que já tinha uma. Editar
    // simplesmente não funcionava, e o erro apontava para o campo errado.
    // Instituição e cidade escolhidas viram texto com um botão "Trocar" ao
    // lado — duas, uma para cada, é a prova de que as duas foram semeadas.
    expect(await screen.findByText(/UFPE/)).toBeInTheDocument();
    expect(screen.getByText('Recife/PE')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Trocar' })).toHaveLength(2);
    // A habilidade já escolhida aparece como pílula removível.
    expect(screen.getByRole('button', { name: 'Remover React' })).toBeInTheDocument();
  });

  it('traz os cinco campos de link com o que já estava guardado @spec:AC-120', async () => {
    renderOnboarding(true);

    expect(await screen.findByLabelText('GitHub')).toHaveValue('https://github.com/ana');
    expect(screen.getByLabelText('TikTok')).toHaveValue('');
    expect(screen.getAllByRole('textbox').filter((c) => c.getAttribute('type') === 'url')).toHaveLength(5);
  });

  it('oferece trocar o nome de usuário só ao editar', async () => {
    renderOnboarding(true);
    expect(await screen.findByLabelText('Nome de usuário')).toHaveValue('ana-ribeiro');
  });

  it('o primeiro cadastro pede só instituição e cidade, em duas etapas', async () => {
    renderOnboarding(false);

    // Eram seis campos obrigatórios numa tela só. Formulário longo na porta de
    // entrada é onde as pessoas desistem, e nada ali era necessário para a rede
    // funcionar para elas. Ficaram os dois que a fazem APARECER: instituição
    // (diretório) e cidade (mapa).
    await screen.findByRole('heading', { name: /onde você estuda/i });
    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();

    for (const campo of ['Nome', 'Curso', 'Bio', 'Nome de usuário', 'GitHub']) {
      expect(screen.queryByLabelText(campo)).not.toBeInTheDocument();
    }
  });

  it('avisa que a pessoa vai aparecer no mapa, e que pode sair @spec:AC-128', async () => {
    renderOnboarding(false);

    // O aviso mora na etapa da CIDADE, e não no rodapé do formulário: ele
    // precisa ser lido no momento da escolha, não depois de rolar a tela.
    await screen.findByRole('heading', { name: /onde você estuda/i });
    await avancarParaCidade();

    // O aviso é a contrapartida de o mapa vir ligado (P-011, invertido em
    // 2026-08-19). Nascer visível só é aceitável se a pessoa souber ao
    // preencher; descobrir por acidente depois é o que não pode acontecer.
    const aviso = await screen.findByText(/vai aparecer no mapa/i);

    expect(aviso).toHaveTextContent(/pode sair/i);
    expect(aviso).toHaveTextContent(/cidade/i);
    expect(aviso).toHaveTextContent(/nunca a localização do seu aparelho/i);
  });

  it('o primeiro preenchimento não oferece navegação que só recusa @spec:AC-107', async () => {
    renderOnboarding(false);

    // O `ProtectedRoute` devolve para cá quem tem perfil incompleto e tenta
    // qualquer outra seção. Oferecer os destinos seria oferecer uma porta que
    // se fecha na cara de quem a abre.
    expect(await screen.findByRole('heading', { name: /onde você estuda/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Seções' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });
});
