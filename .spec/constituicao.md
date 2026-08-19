# Constituição — ConnectGSA — v1.0.0

<!--
  Princípios inegociáveis do ConnectGSA: rede social FECHADA para
  participantes do Programa de Embaixadores Estudantis do Google.
  Base: LGPD (Lei 13.709/2018) aplicada a dados de estudantes
  universitários, com agravante de GEOLOCALIZAÇÃO e de o diretório
  ser, na prática, uma lista de contatos de alto valor.

  Níveis: [DEVE] obrigatório · [RECOMENDADO] forte · [PODE] permitido/explícito.
  Todo [DEVE] precisa de verificação executável. Formatos aceitos:
    - verificação(teste): @principle:P-xxx
    - verificação(proibido): `regex` em `glob`
    - verificação(obrigatório): `regex` em `glob`
-->

## P-001 [DEVE] Coordenada exata de um embaixador nunca é persistida nem servida

O sistema guarda o vínculo do embaixador com uma **cidade** e usa o centroide
da cidade para o mapa. Latitude/longitude precisas do dispositivo não são
gravadas em lugar nenhum, e nenhuma resposta da API expõe posição mais fina
que o município. Arredondar só na saída é insuficiente: um bug de serialização
vazaria a localização precisa de centenas de estudantes.

- verificação(teste): @principle:P-001

## P-002 [DEVE] E-mail e identificadores de conta nunca saem da API

E-mail, `providerAccountId` e tokens de OAuth jamais aparecem em payload de
resposta, nem para o próprio usuário em rotas de listagem. O diretório de
embaixadores é uma lista de contatos valiosa e é o alvo óbvio de scraping.

- verificação(teste): @principle:P-002

## P-003 [DEVE] Acesso é restrito à allowlist do programa

Autenticar com Google/LinkedIn/GitHub não basta. O primeiro login só cria conta
se houver convite válido e não usado, ou e-mail em lista aprovada. Sem isso, a
sessão é recusada e nenhum registro de usuário é criado.

- verificação(teste): @principle:P-003

## P-004 [DEVE] Autorização acontece no servidor

Toda rota que lê dado de terceiro ou muda estado checa permissão no backend
(CASL). Esconder botão no front é experiência de uso, nunca controle de acesso.

- verificação(teste): @principle:P-004

## P-005 [DEVE] Dado pessoal nunca aparece em log

E-mail, telefone, token, coordenada e código de convite nunca vão para
console/logger em texto puro — nem em log de erro.

- verificação(proibido): `console\.(log|error|warn|info|debug)\([^)]*(email|token|convite|inviteCode|latitude|longitude|password|secret)` em `apps/**/src/**/*.ts`

## P-006 [DEVE] Toda entrada externa é validada, e todo texto livre é sanitizado

Nenhuma rota lê `request.body`/`query`/`params` sem schema Zod. Campo de texto
livre (bio, post, comentário) passa por sanitização explícita no servidor antes
de persistir — Zod valida formato, não neutraliza HTML.

- verificação(teste): @principle:P-006

## P-007 [DEVE] Segredo nunca é versionado

Client secret de OAuth, string de conexão do banco e credencial de serviço vivem
em variável de ambiente e no Secret Manager. O repositório contém apenas
`.env.example` com placeholders.

O regex abaixo ignora interpolação (`$VAR`, `${{ ... }}`) de propósito: uma URL
montada a partir de variáveis não carrega credencial nenhuma. Ele continua
pegando qualquer senha escrita por extenso — inclusive uma "descartável", porque
abrir exceção para essas é como a próxima, que não é, passa despercebida.

- verificação(proibido): `(GOCSPX-|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^\s"'$]*:[^\s"'@$]+@)` em `apps/**/*.ts`
- verificação(proibido): `(GOCSPX-|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^\s"'$]*:[^\s"'@$]+@)` em `apps/**/*.tsx`
- verificação(proibido): `(GOCSPX-|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^\s"'$]*:[^\s"'@$]+@)` em `packages/**/*.ts`
- verificação(proibido): `(GOCSPX-|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^\s"'$]*:[^\s"'@$]+@)` em `.github/**/*.yml`

## P-008 [DEVE] Sessão vive em cookie httpOnly — nunca em armazenamento do browser

Token de sessão ou refresh token em `localStorage`/`sessionStorage` é XSS com
persistência. A sessão é cookie `httpOnly` + `Secure` + `SameSite`.

- verificação(proibido): `(local|session)Storage\.[gs]etItem\([^)]*(token|session|jwt|auth)` em `apps/web/src/**/*.ts`
- verificação(proibido): `(local|session)Storage\.[gs]etItem\([^)]*(token|session|jwt|auth)` em `apps/web/src/**/*.tsx`

## P-009 [DEVE] Convite é imprevisível, guardado como hash e de uso único

Código de convite tem no mínimo 128 bits de entropia vinda de gerador
criptográfico e expira. O banco guarda apenas o SHA-256 do código, nunca o
código em claro: um dump vazado não entrega convite utilizável, e nem nós
conseguimos recuperar um código já emitido.

A reserva do convite é um compare-and-set atômico executado pelo Postgres, na
criação da conta. Checar-e-depois-gravar em dois passos deixaria uma janela
entre a leitura e a escrita — e é exatamente essa janela que duas tentativas
simultâneas exploram.

- verificação(teste): @principle:P-009

## P-010 [RECOMENDADO] Minimização: só coletar o que a conexão entre embaixadores exige

Todo campo pessoal novo tem, na spec da feature que o introduz, a justificativa
de por que a rede não funciona sem ele (LGPD art. 6º, III).

## P-011 [RECOMENDADO] Aparecer no mapa é opt-in consciente

O embaixador escolhe se entra no mapa, e o padrão de um perfil recém-criado é
não aparecer. Sair do mapa tem efeito imediato.

## P-012 [DEVE] Titular pode exportar e excluir seus dados

Exportação em formato legível por máquina e exclusão de conta a pedido — LGPD
art. 18, incisos V e VI.

Excluir apaga também as IMAGENS no armazenamento, não só as linhas do banco, e
acerta os contadores desnormalizados das publicações de terceiros antes da
cascata. Sem a primeira, os arquivos seguem acessíveis por URL; sem a segunda,
os contadores de outras pessoas mentem para sempre.

- verificação(teste): @principle:P-012

## P-013 [PODE] Ranking de gamificação só com opt-in

Pontuação é sempre visível ao próprio embaixador. Ranking comparativo público
só existe se o participante escolher aparecer.
