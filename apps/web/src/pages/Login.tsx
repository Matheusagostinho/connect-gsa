import { GitHubMark, GoogleMark, LinkedInMark } from '../components/BrandMarks.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Button, Card, Shell, UnofficialNotice, Wordmark } from '../components/ui.tsx';
import { socialSignInUrl } from '../lib/api.js';

const PROVEDORES = [
  { id: 'google', label: 'Continuar com Google', Mark: GoogleMark },
  { id: 'linkedin', label: 'Continuar com LinkedIn', Mark: LinkedInMark },
  { id: 'github', label: 'Continuar com GitHub', Mark: GitHubMark },
] as const;

/**
 * Entrada por provedor social (US-001).
 *
 * Não existe formulário de senha aqui, e isso é decisão de segurança, não
 * economia de tela: sem senha própria não há hash para vazar nem fluxo de
 * recuperação para atacar.
 */
export function LoginPage() {
  return (
    <Shell>
      <header className="mb-12 flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </header>

      <h1 className="display mb-3 text-4xl sm:text-5xl">
        A rede dos <span className="spark-text">embaixadores</span>
      </h1>
      <p className="mb-10 text-lg text-ink-muted">
        Use uma conta que você já tem. Não criamos senha nova.
      </p>

      <Card className="flex flex-col gap-3">
        {PROVEDORES.map(({ id, label, Mark }) => (
          <Button
            key={id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.location.assign(socialSignInUrl(id))}
          >
            <Mark />
            {label}
          </Button>
        ))}
      </Card>

      <p className="mt-8 text-sm text-ink-muted">
        Ainda não tem convite?{' '}
        <a href="/convite" className="font-medium text-ink underline">
          Informe seu código
        </a>
        .
      </p>

      <UnofficialNotice className="mt-16" />
    </Shell>
  );
}
