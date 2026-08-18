import type { MyProfile } from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { logout } from '../lib/api.js';
import { Avatar } from './Avatar.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { cn } from './ui.tsx';

/**
 * Menu da conta, com a saída.
 *
 * Ao sair, o cache do React Query é ZERADO antes da navegação. Sem isso, o
 * perfil e o feed da pessoa anterior continuariam em memória e apareceriam por
 * um instante para quem entrasse depois — o pior lugar possível para um vazamento,
 * já que este produto existe para ser usado em computador compartilhado de
 * laboratório.
 */
export function AccountMenu({ profile }: { profile: MyProfile }) {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const fechar = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setAberto(false);
        return;
      }
      if (!container.current?.contains(event.target as Node)) setAberto(false);
    };

    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', fechar);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', fechar);
    };
  }, [aberto]);

  const sair = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      queryClient.clear();
      await navigate('/entrar', { replace: true });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      <div ref={container} className="relative">
        <button
          type="button"
          onClick={() => setAberto((estava) => !estava)}
          aria-expanded={aberto}
          aria-haspopup="menu"
          aria-label="Menu da conta"
          className="flex cursor-pointer items-center rounded-pill focus-visible:outline-2"
        >
          <Avatar name={profile.name} imageUrl={profile.imageUrl} size={36} />
        </button>

        {aberto ? (
          <div
            role="menu"
            className={cn(
              'absolute top-full right-0 z-20 mt-2 w-56 rounded-card border border-border',
              'bg-surface-raised p-1.5 shadow-[var(--shadow-card)]',
            )}
          >
            <p className="truncate px-3 py-2 text-sm font-medium text-ink">{profile.name}</p>

            <Link
              to="/perfil"
              role="menuitem"
              onClick={() => setAberto(false)}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field px-3 text-sm text-ink transition-colors duration-200 hover:bg-surface-subtle"
            >
              <User className="size-4" aria-hidden="true" />
              Meu perfil
            </Link>

            <button
              type="button"
              role="menuitem"
              disabled={sair.isPending}
              onClick={() => sair.mutate()}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-field px-3 text-sm text-ink transition-colors duration-200 hover:bg-surface-subtle disabled:cursor-not-allowed"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {sair.isPending ? 'Saindo…' : 'Sair'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
