/**
 * Logotipos dos provedores de login.
 *
 * O lucide-react deixou de distribuir ícones de marca na versão 1, então eles
 * vivem aqui. São marcas de terceiros, usadas apenas para identificar o botão
 * de login correspondente — que é o uso previsto pelas diretrizes dos três
 * provedores.
 */
const base = 'size-4 shrink-0';

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.68 4.1-5.35 4.1a5.9 5.9 0 0 1 0-11.8c1.87 0 3.13.8 3.85 1.48l2.62-2.53C16.8 3.7 14.6 2.8 12 2.8a9.2 9.2 0 1 0 0 18.4c5.31 0 8.83-3.73 8.83-8.98 0-.6-.06-1.06-.15-1.5Z"
      />
    </svg>
  );
}

export function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm6.5 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.3 8.65 22 10.9 22 14v7h-4v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.37 1.6-2.37 3.27V21h-4V9Z"
      />
    </svg>
  );
}

export function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85l-.01 2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"
      />
    </svg>
  );
}
