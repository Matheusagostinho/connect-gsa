import { useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'connect-gsa-theme';

function readStoredChoice(): ThemeChoice {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/**
 * Aplica a escolha de tema no elemento raiz.
 *
 * "system" REMOVE o atributo em vez de calcular claro ou escuro em JavaScript:
 * assim quem manda é a media query do CSS, e o tema acompanha o sistema
 * operacional se ele mudar com a aba já aberta.
 */
function applyChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function useTheme(): { choice: ThemeChoice; setChoice: (next: ThemeChoice) => void } {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => readStoredChoice());

  useEffect(() => {
    applyChoice(choice);
  }, [choice]);

  return {
    choice,
    setChoice: (next) => {
      // A preferência de tema não é dado de sessão — guardá-la aqui não conflita
      // com a regra de nunca pôr credencial em armazenamento do navegador.
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
      setChoiceState(next);
    },
  };
}

/**
 * Aplica o tema antes do React montar.
 *
 * Sem isto a página pinta claro por um quadro e só então escurece — o clarão
 * branco que incomoda justamente quem escolheu o tema escuro.
 */
export function applyStoredThemeEagerly(): void {
  applyChoice(readStoredChoice());
}
