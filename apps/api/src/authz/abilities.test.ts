import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '../auth/session.js';
import { assertCan } from './guard.js';

const embaixador = (id: string): CurrentUser => ({ id, role: 'ambassador', profileComplete: true });
const moderador = (id: string): CurrentUser => ({ id, role: 'moderator', profileComplete: true });
const admin = (id: string): CurrentUser => ({ id, role: 'admin', profileComplete: true });

describe('permissões', () => {
  it('deixa o embaixador editar apenas o próprio perfil @spec:AC-013 @principle:P-004', () => {
    const ana = embaixador('ana');

    expect(() => assertCan(ana, 'update', 'Profile', { id: 'ana' })).not.toThrow();
    expect(() => assertCan(ana, 'update', 'Profile', { id: 'bruno' })).toThrow(/permissão/i);
  });

  it('deixa qualquer embaixador ler o diretório', () => {
    expect(() => assertCan(embaixador('ana'), 'read', 'Profile')).not.toThrow();
  });

  it('deixa todo embaixador gerar convite; o teto fica no serviço @spec:AC-017', () => {
    // Convidar deixou de ser privilégio da coordenação (AC-017, invertido em
    // 2026-08-19). O que segura o portão passou a ser o TETO por período, que
    // vive no serviço — o CASL decide sobre o que já está em memória, e contar
    // convites criados exige ir ao banco.
    expect(() => assertCan(embaixador('ana'), 'create', 'Invite')).not.toThrow();
    expect(() => assertCan(moderador('bruno'), 'create', 'Invite')).not.toThrow();
    expect(() => assertCan(admin('carla'), 'create', 'Invite')).not.toThrow();
  });

  it('só deixa coordenação publicar aviso oficial', () => {
    expect(() => assertCan(embaixador('ana'), 'create', 'Announcement')).toThrow(/permissão/i);
    expect(() => assertCan(moderador('bruno'), 'create', 'Announcement')).not.toThrow();
  });

  it('não deixa moderador editar perfil alheio — moderar não é personificar', () => {
    expect(() => assertCan(moderador('bruno'), 'update', 'Profile', { id: 'ana' })).toThrow(
      /permissão/i,
    );
  });
});
