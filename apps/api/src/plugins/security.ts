import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { POST_LIMITS } from '@connect-gsa/shared';
import type { Env } from '../env.js';

/**
 * Camada de segurança que vale para toda a API.
 *
 * Limites específicos e mais apertados (resgate de convite, por exemplo) são
 * declarados na própria rota — este é o piso, não o teto.
 */
export async function registerSecurity(app: FastifyInstance, env: Env): Promise<void> {
  // A API responde JSON e nunca serve HTML de aplicação; a única exceção é a
  // rota de prévia de link, que declara a própria política.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  // Lista explícita de origens. `credentials: true` é obrigatório porque a
  // sessão viaja em cookie (P-008) — e é justamente por isso que curinga de
  // origem não é uma opção aqui.
  await app.register(cors, {
    origin: env.WEB_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    maxAge: 86_400,
  });

  await app.register(cookie, {
    secret: env.BETTER_AUTH_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
      // O mesmo `SameSite` da sessão, e pelo mesmo motivo: o bilhete do convite
      // precisa sobreviver ao vaivém do OAuth. Divergir daria um cookie que
      // atravessa e outro que não, e o convite se perderia no meio do caminho.
      sameSite: env.COOKIE_SAME_SITE,
      path: '/',
    },
  });

  // O teto de tamanho é aplicado no plugin, antes de o corpo ser lido inteiro:
  // recusar 50 MB depois de recebê-los seria pagar a banda à toa.
  await app.register(multipart, {
    // O mesmo teto do `POST_LIMITS.imageBytesMax`, e não um número solto: dois
    // limites parecidos em lugares diferentes viram um desatualizado no dia em
    // que alguém mexe num só — e aí o multipart aceita o que a rota recusa.
    limits: { fileSize: POST_LIMITS.imageBytesMax, files: 1, fields: 4 },
  });

  // Piso global. O diretório de embaixadores é uma lista de contatos valiosa:
  // sem limite, uma única sessão autenticada raspa a rede inteira (P-002).
  //
  // Chaveia pelo usuário quando há sessão; por IP quando não há. Sem isso, uma
  // rede universitária inteira atrás de um NAT compartilharia o limite.
  //
  // O teto é configurável por um motivo concreto: a rota SEM sessão cai no IP, e
  // a suíte de testes dispara centenas dessas contra `127.0.0.1` em segundos.
  // Com o teto de produção, testes passaram a falhar por 429 de forma
  // INTERMITENTE — e a fatia que quebrava mudava a cada execução, o que é o
  // pior tipo de falha que existe. `testing/app.ts` eleva o número; o teto POR
  // ROTA, que é o que os testes de limite exercitam, continua valendo.
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.session?.userId ?? request.ip,
  });
}
