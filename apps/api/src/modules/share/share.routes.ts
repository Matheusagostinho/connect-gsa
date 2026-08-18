import type { PrismaClient } from '@connect-gsa/db';
import { z } from 'zod';
import type { Env } from '../../env.js';
import type { AppInstance } from '../../types.js';

/**
 * Prévia de link para redes e mensageiros (Open Graph).
 *
 * O problema que isto resolve: o ConnectGSA é um SPA, e o rastreador do
 * WhatsApp, do LinkedIn e do Telegram não executa JavaScript — ele lê o HTML
 * cru e vai embora. Sem esta rota, todo link compartilhado apareceria como um
 * retângulo vazio, o que sabota exatamente o boca a boca que faz uma rede
 * crescer.
 *
 * Note o que a prévia NÃO traz: e-mail, cidade ou bio (P-002). Uma prévia é
 * pública por definição — qualquer pessoa em qualquer grupo vê o que estiver
 * aqui. Então ela carrega apenas nome, instituição e a marca da rede.
 */

/** Escapa para contexto HTML. Defesa em profundidade: a bio já entra sanitizada. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Rastreadores de prévia. Gente é redirecionada para o aplicativo. */
const CRAWLER_PATTERN =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|SkypeUriPreview|redditbot|Googlebot/i;

export function registerShareRoutes(app: AppInstance, prisma: PrismaClient, env: Env): void {
  app.get(
    '/s/profile/:id',
    {
      schema: { params: z.object({ id: z.uuid() }) },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userAgent = request.headers['user-agent'] ?? '';
      const appUrl = `${env.WEB_URL}/perfil/${request.params.id}`;

      // Pessoa vai direto para o aplicativo; só o rastreador recebe HTML.
      if (!CRAWLER_PATTERN.test(userAgent)) {
        return reply.redirect(appUrl, 302);
      }

      const profile = await prisma.user.findFirst({
        where: { id: request.params.id, profileComplete: true },
        select: { name: true, institution: { select: { name: true, acronym: true } } },
      });

      const title = profile ? `${profile.name} no ConnectGSA` : 'ConnectGSA';
      const institution = profile?.institution?.acronym ?? profile?.institution?.name;
      const description = profile
        ? `Embaixador${institution ? ` — ${institution}` : ''} no Programa de Embaixadores Estudantis do Google.`
        : 'A rede dos participantes do Programa de Embaixadores Estudantis do Google.';

      return reply
        .header('content-type', 'text/html; charset=utf-8')
        // A prévia é cacheável: o rastreador do WhatsApp busca uma vez por
        // link compartilhado, e um link viral seria buscado muitas vezes.
        .header('cache-control', 'public, max-age=600')
        .send(
          `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="ConnectGSA">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(appUrl)}">
<meta name="twitter:card" content="summary">
<meta name="robots" content="noindex">
</head>
<body><a href="${escapeHtml(appUrl)}">Abrir no ConnectGSA</a></body>
</html>`,
        );
    },
  );
}
