import { subject } from '@casl/ability';
import type { CurrentUser } from '../auth/session.js';
import { forbidden } from '../plugins/errors.js';
import { defineAbilitiesFor, type Action, type Subject } from './abilities.js';

/**
 * Recusa a operação quando o usuário não tem permissão.
 *
 * Lança em vez de devolver booleano de propósito: um `if (can(...))` esquecido
 * falha aberto e ninguém percebe; um `assertCan(...)` esquecido aparece no
 * teste de autorização da rota.
 */
export function assertCan(
  user: CurrentUser,
  action: Action,
  subjectType: Subject,
  resource?: Record<string, unknown>,
): void {
  const ability = defineAbilitiesFor(user);
  const target = resource ? subject(subjectType, resource) : subjectType;

  if (!ability.can(action, target)) {
    throw forbidden();
  }
}

export { defineAbilitiesFor };
