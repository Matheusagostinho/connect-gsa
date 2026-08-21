import { Compass, Map, Users } from 'lucide-react';
import { Link } from 'react-router';
import { LogoMark, Wordmark } from '../components/Logo.tsx';
import { PixelCloud } from '../components/PixelCloud.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Button, Card, UnofficialNotice } from '../components/ui.tsx';

const DESTAQUES = [
  {
    Icon: Compass,
    titulo: 'Encontre quem faz o que você faz',
    texto:
      'Busque por instituição, campus, curso ou habilidade. São 628 instituições e um catálogo de habilidades que realmente se cruzam.',
  },
  {
    Icon: Map,
    titulo: 'Veja quem está perto',
    texto:
      'Um mapa por cidade, nunca por endereço. A rede conhece só o seu município, e sair do mapa é um toque em Configurações.',
  },
  {
    Icon: Users,
    titulo: 'Conecte com intenção',
    texto:
      'Reações que dizem mais que “gostei”: Decolou, Aprendi, Respeito — e “Bora junto” e “Posso ajudar”, para quando você quer construir com alguém.',
  },
];

/**
 * A porta de entrada para quem ainda não está autenticado.
 *
 * Curta de propósito: a rede é fechada, então esta página não vende — ela
 * explica o que existe do outro lado para quem recebeu um convite e quer saber
 * onde está entrando.
 *
 * A nuvem de pixels é o único movimento do produto que existe por si. Aqui ele
 * cabe: é a primeira impressão de uma rede sobre tecnologia, e a linguagem do
 * antigravity.google — de onde este design system veio. Dentro do aplicativo,
 * o mesmo efeito seria movimento competindo com conteúdo.
 */
export function LandingPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-surface">
      {/*
        A nuvem cobre a PÁGINA inteira, atrás de tudo. Presa à seção do título
        ela terminava numa borda reta no meio da tela, e o corte denunciava que
        era um retângulo — o efeito só funciona quando não se vê onde ele acaba.
        
        `fixed` e não `absolute`: assim ela não estica com a rolagem nem obriga a
        pintar uma malha do tamanho do documento inteiro.
      */}
      {/*
        `w-screen` e não `w-full`: com `scrollbar-gutter: stable` reservando a
        calha, 100% da caixa que contém para quinze pixels antes da borda — e a
        nuvem terminava numa faixa vazia à direita. `100vw` inclui a calha.
        
        Isso não cria rolagem horizontal porque o elemento é `fixed` e a página
        recorta o excesso: `overflow-x: clip` no invólucro.
      */}
      <PixelCloud className="fixed inset-0 z-0 h-dvh w-screen opacity-70" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <section className="py-12 sm:py-20">
          <LogoMark className="mb-8 size-16" />

          <h1 className="display max-w-3xl text-4xl sm:text-6xl">
            A rede dos <span className="spark-text-vivo">embaixadores</span> do programa
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Um espaço fechado para quem participa do Programa de Embaixadores Estudantis do
            Google encontrar, reconhecer e trabalhar junto com os outros participantes.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/convite">
              <Button>Tenho um convite</Button>
            </Link>
            <Link to="/entrar">
              <Button variant="outline">Já faço parte</Button>
            </Link>
          </div>
        </section>

        <section aria-labelledby="o-que-tem" className="py-8">
          <h2 id="o-que-tem" className="sr-only">
            O que a rede oferece
          </h2>

          <ul className="grid gap-4 sm:grid-cols-3">
            {DESTAQUES.map(({ Icon, titulo, texto }) => (
              <li key={titulo}>
                <Card className="h-full p-6">
                  <Icon className="size-5 text-ink-muted" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-medium">{titulo}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{texto}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-12">
          <Card className="text-center">
            <h2 className="display text-2xl">Entrada só por convite</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-muted">
              Entrar com Google, LinkedIn ou GitHub prova quem você é — mas não basta. É
              preciso um convite da coordenação ou estar na lista oficial do programa. É isso
              que mantém a rede sendo dos embaixadores.
            </p>
            <Link to="/convite" className="mt-6 inline-block">
              <Button>Informar meu código</Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-8">
        <UnofficialNotice />
      </footer>
    </div>
  );
}
