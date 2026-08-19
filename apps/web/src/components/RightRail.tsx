import { ArrowRight, Megaphone, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from './Avatar.tsx';
import { useAnnouncements } from '../lib/announcements.js';
import { useDirectory } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';
import { cn } from './ui.tsx';

/** Sugerir muita gente de uma vez vira lista; três é convite. */
const QUANTAS_SUGESTOES = 3;

function Bloco({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-card border border-border bg-surface-subtle/60 p-4', className)}
      aria-label={titulo}
    >
      <h2 className="mb-3 text-sm font-medium text-ink">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * A coluna da direita, a partir de telas muito largas.
 *
 * Ela não introduz nada novo: mostra o que a rede já serve — gente do diretório,
 * o aviso mais recente — num lugar onde antes havia trezentos pixels de nada.
 * Numa rede que está começando, o problema não é excesso de conteúdo, é a
 * pessoa não saber que existe mais alguém do outro lado.
 *
 * Some abaixo de 1536px em vez de espremer: entre uma coluna estreita e uma
 * coluna ausente, a ausente lê melhor. O limiar subiu junto com a largura do
 * conteúdo, que passou a ser a mesma em todas as telas. E, por ser secundária,
 * ela fica DEPOIS do conteúdo na ordem do documento — quem navega por teclado
 * chega ao feed antes de chegar às sugestões.
 */
export function RightRail() {
  const { data: eu } = useMyProfile();
  const { data: paginas } = useDirectory({});
  const { data: avisos } = useAnnouncements();

  const sugestoes = (paginas?.pages[0]?.people ?? [])
    .filter((pessoa) => pessoa.id !== eu?.id && pessoa.connection === 'none')
    .slice(0, QUANTAS_SUGESTOES);

  const aviso = avisos?.[0];

  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col gap-4 overflow-y-auto py-4 pl-6 2xl:flex">
      {sugestoes.length > 0 ? (
        <Bloco titulo="Embaixadores para conhecer">
          <ul className="flex flex-col gap-1">
            {sugestoes.map((pessoa) => (
              <li key={pessoa.id}>
                <Link
                  to={`/perfil/${pessoa.slug}`}
                  className="flex items-center gap-3 rounded-field p-2 transition-colors duration-200 hover:bg-surface-raised"
                >
                  <Avatar name={pessoa.name} imageUrl={pessoa.imageUrl} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {pessoa.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {[pessoa.institution, pessoa.course].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <UserPlus className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to="/diretorio"
            className="mt-2 flex items-center gap-1.5 rounded-field p-2 text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            Ver o diretório
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Bloco>
      ) : null}

      {aviso ? (
        <Bloco titulo="Do quadro de avisos">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
            <Megaphone className="size-3.5" aria-hidden="true" />
            {aviso.author.name}
          </p>
          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink">{aviso.content}</p>
          <Link
            to="/avisos"
            className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            Ver todos os avisos
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Bloco>
      ) : null}

      <p className="px-2 text-xs leading-relaxed text-ink-muted">
        Projeto não oficial, sem afiliação com o Google.
      </p>
    </aside>
  );
}
