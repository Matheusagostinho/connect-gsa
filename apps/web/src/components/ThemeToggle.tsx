import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeChoice } from '../lib/theme.js';
import { cn } from './ui.tsx';

const OPCOES: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Tema claro', Icon: Sun },
  { value: 'dark', label: 'Tema escuro', Icon: Moon },
  { value: 'system', label: 'Seguir o sistema', Icon: Monitor },
];

/**
 * Alternador de tema.
 *
 * É um grupo de rádio, não um interruptor: são três estados, e "seguir o
 * sistema" precisa ser alcançável — quem liga o modo escuro por horário no
 * sistema operacional espera que o site acompanhe.
 */
export function ThemeToggle() {
  const { choice, setChoice } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-surface-subtle p-0.5"
    >
      {OPCOES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => setChoice(value)}
          className={cn(
            'flex size-9 cursor-pointer items-center justify-center rounded-pill transition-colors duration-200',
            choice === value
              ? 'bg-action text-on-action'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
