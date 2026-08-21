import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';
import { testEnv } from '../../testing/app.js';
import { avisar, desinscrever, estaInscrito, inscrever } from './push.service.js';

const prisma = testDb();
const silencioso = { warn: () => undefined };

/**
 * Um ambiente COM chaves — o `testEnv` não tem, e é isso que desliga o envio.
 *
 * O par é REAL (gerado por `web-push generate-vapid-keys`) e descartável: o
 * `setVapidDetails` valida o formato de verdade, e uma chave de mentira falha
 * antes de o teste chegar no que ele quer exercitar.
 *
 * Chave de teste em arquivo versionado é aceitável aqui porque ela não protege
 * nada: VAPID identifica o REMETENTE para o serviço de push, e este par nunca
 * foi usado para inscrever aparelho nenhum.
 */
const comChaves = {
  ...testEnv,
  VAPID_PUBLIC_KEY:
    'BLPmQ9UvZjH6mbNdgiq0MxSq-xDH60BEwCFX6Sbv3-3tnQ7bnX35ksKEhhdKubp9pbZXHs9jAyJsTF7_799KsUc',
  VAPID_PRIVATE_KEY: 'AnXUsaN4k8iq0Hp-B6AHrIDl5dLt91bxA-RSedoisbs',
  VAPID_SUBJECT: 'mailto:contato@exemplo.test',
};

const AVISO = { titulo: 'Nova reação', corpo: 'Ana reagiu.', url: '/notificacoes', tag: 't' };

function inscricao(sufixo: string) {
  return {
    endpoint: `https://push.exemplo.test/${sufixo}`,
    keys: { p256dh: 'chave-do-aparelho', auth: 'segredo' },
  };
}

beforeEach(async () => {
  await resetTestData();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDb();
});

describe('inscrição de aparelho', () => {
  it('o mesmo aparelho inscrito duas vezes não vira duas linhas @spec:AC-157', async () => {
    const ana = await createTestUser();

    await inscrever(prisma, ana.id, inscricao('a'));
    await inscrever(prisma, ana.id, inscricao('a'));

    // Sem o `upsert` pelo endpoint, a pessoa receberia o aviso em duplicata.
    await expect(prisma.pushSubscription.count()).resolves.toBe(1);
    await expect(estaInscrito(prisma, ana.id)).resolves.toBe(true);
  });

  it('o mesmo aparelho passa a ser de quem está logado agora @spec:AC-157', async () => {
    const ana = await createTestUser();
    const bruno = await createTestUser();

    await inscrever(prisma, ana.id, inscricao('compartilhado'));
    await inscrever(prisma, bruno.id, inscricao('compartilhado'));

    // Num computador compartilhado, a inscrição antiga continuaria entregando
    // avisos da Ana para o Bruno.
    await expect(estaInscrito(prisma, ana.id)).resolves.toBe(false);
    await expect(estaInscrito(prisma, bruno.id)).resolves.toBe(true);
  });

  it('sair remove aquele aparelho, e só ele @spec:AC-158', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('celular'));
    await inscrever(prisma, ana.id, inscricao('computador'));

    await desinscrever(prisma, 'https://push.exemplo.test/computador');

    const restantes = await prisma.pushSubscription.findMany({ select: { endpoint: true } });
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.endpoint).toContain('celular');
  });

  it('excluir a conta leva as inscrições junto', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('a'));

    await prisma.user.delete({ where: { id: ana.id } });

    // Sem o cascade, o aparelho continuaria recebendo aviso de uma rede da qual
    // a pessoa saiu.
    await expect(prisma.pushSubscription.count()).resolves.toBe(0);
  });
});

describe('envio do aviso', () => {
  it('não faz nada quando o servidor não tem chaves', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('a'));

    const webpush = await import('web-push');
    const enviar = vi.spyOn(webpush.default, 'sendNotification');

    // Sem chaves o recurso não existe — e tentar enviar assim mesmo derrubaria
    // a ação que gerou o aviso.
    await avisar(prisma, testEnv, ana.id, AVISO, silencioso);

    expect(enviar).not.toHaveBeenCalled();
  });

  it('apaga a inscrição quando o serviço responde 404 ou 410 @spec:AC-159', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('morta'));
    await inscrever(prisma, ana.id, inscricao('viva'));

    const webpush = await import('web-push');
    vi.spyOn(webpush.default, 'sendNotification').mockImplementation((sub) => {
      if (sub.endpoint.includes('morta')) {
        return Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 }));
      }
      return Promise.resolve({ statusCode: 201, body: '', headers: {} });
    });

    await avisar(prisma, comChaves, ana.id, AVISO, silencioso);

    // Sem a limpeza, a tabela vira um cemitério percorrido a cada aviso — e o
    // tempo de envio cresce com o número de gente que SAIU.
    const restantes = await prisma.pushSubscription.findMany({ select: { endpoint: true } });
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.endpoint).toContain('viva');
  });

  it('mantém a inscrição quando a falha é passageira', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('a'));

    const webpush = await import('web-push');
    vi.spyOn(webpush.default, 'sendNotification').mockRejectedValue(
      Object.assign(new Error('instável'), { statusCode: 500 }),
    );

    await avisar(prisma, comChaves, ana.id, AVISO, silencioso);

    // Apagar por causa de uma instabilidade do fabricante tiraria o aviso de
    // quem não fez nada errado.
    await expect(prisma.pushSubscription.count()).resolves.toBe(1);
  });

  it('nunca lança: falhar no envio não pode desfazer a ação @spec:AC-159', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('a'));

    const webpush = await import('web-push');
    vi.spyOn(webpush.default, 'sendNotification').mockRejectedValue(new Error('rede fora'));

    // Quem reagiu já reagiu. O serviço do fabricante estar fora não pode
    // recusar a reação.
    await expect(avisar(prisma, comChaves, ana.id, AVISO, silencioso)).resolves.toBeUndefined();
  });

  it('o log da falha traz o status, e nunca o endpoint @principle:P-005', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, inscricao('a'));

    const avisos: Record<string, unknown>[] = [];
    const webpush = await import('web-push');
    vi.spyOn(webpush.default, 'sendNotification').mockRejectedValue(
      Object.assign(new Error('x'), { statusCode: 500 }),
    );

    await avisar(prisma, comChaves, ana.id, AVISO, {
      warn: (dados) => void avisos.push(dados),
    });

    // O endpoint identifica o APARELHO de uma pessoa — log é log.
    expect(avisos[0]).toMatchObject({ status: 500 });
    expect(JSON.stringify(avisos)).not.toContain('push.exemplo.test');
  });
});
