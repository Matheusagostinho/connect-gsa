import { GitHubMark, GoogleMark, LinkedInMark } from '../components/BrandMarks.tsx';
import { Button, Card } from '../components/ui.tsx';
import { socialSignInUrl } from '../lib/api.js';

/**
 * Entrada por provedor social (US-001).
 *
 * Não existe formulário de senha aqui, e isso é uma decisão de segurança, não
 * uma economia de tela: sem senha própria não há hash para vazar nem fluxo de
 * recuperação para atacar.
 */
export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="text-2xl font-extrabold">Entrar no ConnectGSA</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use uma conta que você já tem. Não criamos senha nova.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="ghost"
            onClick={() => window.location.assign(socialSignInUrl('google'))}
          >
            <GoogleMark />
            Continuar com Google
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.assign(socialSignInUrl('linkedin'))}
          >
            <LinkedInMark />
            Continuar com LinkedIn
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.assign(socialSignInUrl('github'))}
          >
            <GitHubMark />
            Continuar com GitHub
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Ainda não tem convite?{' '}
          <a href="/convite" className="font-semibold text-primary underline">
            Informe seu código
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
