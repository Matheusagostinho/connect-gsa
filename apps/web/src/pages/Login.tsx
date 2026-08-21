import { useState } from 'react';
import { GitHubMark, GoogleMark, LinkedInMark } from '../components/BrandMarks.tsx';
import { LogoMark, Wordmark } from '../components/Logo.tsx';
import { PixelCloud } from '../components/PixelCloud.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Button, UnofficialNotice } from '../components/ui.tsx';
import { socialSignIn } from '../lib/api.js';
import { lerConvite } from '../lib/invite-guardado.js';

/**
 * Os provedores, e quais aparecem HOJE.
 *
 * `visivel: false` esconde o botão sem apagar nada: o servidor continua
 * aceitando os três, quem já entrou por LinkedIn ou GitHub continua entrando, e
 * religar é trocar uma palavra. Apagar o código exigiria reescrevê-lo depois, e
 * o custo de manter três linhas é zero.
 *
 * Google sozinho na estreia porque é o provedor que todo participante do
 * programa tem, e uma tela com uma escolha é mais rápida que uma com três.
 */
const PROVEDORES = [
  { id: 'google', label: 'Entrar com Google', Mark: GoogleMark, visivel: true },
  { id: 'linkedin', label: 'Entrar com LinkedIn', Mark: LinkedInMark, visivel: false },
  { id: 'github', label: 'Entrar com GitHub', Mark: GitHubMark, visivel: false },
] as const;

/**
 * Entrada por provedor social (US-001).
 *
 * Não existe formulário de senha aqui, e isso é decisão de segurança, não
 * economia de tela: sem senha própria não há hash para vazar nem fluxo de
 * recuperação para atacar.
 *
 * A tela usa o MESMO fundo da apresentação — a nuvem de pixels — porque quem
 * chega aqui vem de lá ou de um link de convite, e trocar de cenário no meio do
 * caminho faz parecer outro produto. É o único lugar dentro do fluxo de entrada
 * onde esse movimento cabe: não há conteúdo com que competir.
 */
export function LoginPage() {
  // O convite que a pessoa abriu antes de vir para cá. Ele já está no cookie
  // assinado do servidor; aqui ele serve para a TELA lembrar do contexto — sem
  // isso, quem clicou num convite chega a uma página de login sem relação
  // aparente com o que acabou de fazer.
  const convite = lerConvite();

  // Os três estados do clique são visíveis, e nenhum é a ausência de algo:
  // entrar leva o navegador para fora do aplicativo, e entre o clique e o
  // redirecionamento existe uma ida ao servidor que pode demorar — no plano
  // gratuito, com a API dormindo, chega a cinquenta segundos. Sem retorno na
  // tela, a pessoa clica de novo.
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(provider: (typeof PROVEDORES)[number]['id']) {
    setIndo(true);
    setErro(null);

    try {
      await socialSignIn(provider);
    } catch {
      // Mensagem sem detalhe técnico: quem lê isto não configura servidor.
      setErro('Não deu para começar a entrada agora. Tente de novo em instantes.');
      setIndo(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip bg-surface">
      {/*
        A mesma nuvem da apresentação, com a mesma justificativa de `fixed` e
        `w-screen` que está lá: presa ao conteúdo ela termina numa borda reta, e
        `w-full` deixa uma faixa vazia por causa da calha da barra de rolagem.
      */}
      <PixelCloud className="fixed inset-0 z-0 h-dvh w-screen opacity-70" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        <LogoMark className="mb-8 size-14" />

        <h1 className="display text-4xl sm:text-5xl">
          A rede dos <span className="spark-text-vivo">embaixadores</span>
        </h1>

        <p className="mt-5 text-lg text-ink-muted">
          Use uma conta que você já tem. Não criamos senha nova.
        </p>

        {convite ? (
          <p className="mt-8 rounded-field border border-border bg-surface-raised/80 p-4 text-sm text-ink-muted backdrop-blur-sm">
            Seu convite está guardado e será usado assim que você entrar.
          </p>
        ) : null}

        <div className="mt-10 flex flex-col gap-3">
          {PROVEDORES.filter((p) => p.visivel).map(({ id, label, Mark }) => (
            /*
              A borda de quatro cores mora num invólucro, não no botão: não dá
              para animar `border-color` com degradê. O `relative` é o que
              ancora o brilho do `::before`, que é posicionado.
            */
            <div key={id} className="borda-spark relative rounded-pill">
              <Button
                className="w-full bg-surface-raised text-ink hover:bg-surface-subtle"
                disabled={indo}
                onClick={() => void entrar(id)}
              >
                <Mark />
                {indo ? 'Abrindo…' : label}
              </Button>
            </div>
          ))}
        </div>

        {erro ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {erro}
          </p>
        ) : null}

        <p className="mt-8 text-sm text-ink-muted">
          Ainda não tem convite?{' '}
          <a href="/convite" className="font-medium text-ink underline">
            Informe seu código
          </a>
          .
        </p>
      </main>

      <footer className="relative z-10 px-5 pb-10">
        <UnofficialNotice />
      </footer>
    </div>
  );
}
