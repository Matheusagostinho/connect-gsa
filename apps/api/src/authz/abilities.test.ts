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

  it('só deixa coordenação gerar convite @spec:AC-017', () => {
    expect(() => assertCan(embaixador('ana'), 'create', 'Invite')).toThrow(/permissão/i);
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
