import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Desmonta o que o teste anterior renderizou.
 *
 * A limpeza automática do Testing Library só entra sozinha com `globals: true`
 * no Vitest, que não usamos. Sem ela, os componentes se acumulam no mesmo
 * documento e toda busca por papel encontra vários elementos — falha confusa,
 * que parece bug do componente e não é.
 */
afterEach(() => {
  cleanup();
});
