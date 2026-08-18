import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { CurrentUser } from '../auth/session.js';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage';
export type Subject = 'Profile' | 'Invite' | 'Announcement' | 'all';

export type AppAbility = MongoAbility<[Action, Subject | { __caslSubjectType__: Subject; id?: string }]>;

/**
 * Quem pode o quê (P-004).
 *
 * Este arquivo é a definição ÚNICA das permissões do ConnectGSA. O SPA importa
 * a mesma ideia para esconder botões, mas quem decide é sempre o servidor: uma
 * requisição forjada não passa pela tela, passa direto pela rota.
 */
export function defineAbilitiesFor(user: CurrentUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Todo embaixador enxerga o diretório e edita o próprio perfil — e só o próprio.
  can('read', 'Profile');
  can('update', 'Profile', { id: user.id } as never);
  can('read', 'Announcement');

  if (user.role === 'moderator' || user.role === 'admin') {
    can('create', 'Invite');
    can('read', 'Invite');
    can('manage', 'Announcement');
  }

  if (user.role === 'admin') {
    can('manage', 'all');
  }

  return build();
}
