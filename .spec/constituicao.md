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

## P-009 [DEVE] Convite é imprevisível, guardado como hash e tem prazo curto

Código de convite vem de gerador criptográfico (`randomInt` do `node:crypto`) e
expira. O banco guarda apenas o SHA-256 do código, nunca o código em claro: um
dump vazado não entrega convite utilizável, e nem nós conseguimos recuperar um
código já emitido.

**Este princípio foi emendado duas vezes, e os dois motivos ficam registrados —
não apagados.**

*2026-08-19 — a entropia.* Ele exigia no mínimo 128 bits, e o código tinha 32
caracteres hexadecimais. Passou a ter 8 caracteres de um alfabeto de 32, que são
40 bits. A razão: um convite precisa ser DITADO por telefone, e 32 caracteres
não são. Os 40 bits bastam porque não são a única defesa — são 1,1 trilhão de
combinações contra um limite agressivo de tentativas, o que dá milhares de anos
para acertar um convite ativo. O texto anterior continuou dizendo 128 bits por
mais um dia, e essa distância entre princípio e código é exatamente o que este
registro existe para não repetir.

*2026-08-20 — o uso único.* Ele exigia que o convite servisse a uma pessoa só, e
a reserva era um compare-and-set atômico no Postgres. Passou a valer para
quantas pessoas receberem o link, por decisão do dono do produto: um embaixador
que quisesse trazer o capítulo inteiro precisava de quarenta links e só podia
criar cinco.

O custo dessa segunda emenda é real e não deve ser minimizado por quem ler isto
depois: **o uso único era o que continha um link vazado, e ele não existe mais.**
Um link colado num grupo de trezentas pessoas entrega trezentos acessos, e
nenhuma outra camada impede isso. O que ficou no lugar é o PRAZO — que por causa
disso caiu de 30 para 15 dias — e o teto de criação por período. Não é
equivalente, e está escrito aqui para que quem mexer nisto depois saiba o que já
foi trocado por quê.

- verificação(teste): @principle:P-009

## P-010 [RECOMENDADO] Minimização: só coletar o que a conexão entre embaixadores exige

Todo campo pessoal novo tem, na spec da feature que o introduz, a justificativa
de por que a rede não funciona sem ele (LGPD art. 6º, III).

## P-011 [RECOMENDADO] Estar no mapa é padrão, e sair é sempre possível

O perfil recém-criado **aparece** no mapa, pela cidade. Sair tem efeito imediato,
e o formulário de entrada diz à pessoa que ela vai aparecer.

**Este princípio foi invertido em 2026-08-19, e o motivo fica registrado.** Ele
dizia o contrário: aparecer era escolha ativa, e o padrão era ficar fora. A razão
era boa — um padrão pré-marcado em algo de localização é o que "opt-in
consciente" existe para evitar. A inversão foi decisão do dono do produto, com o
custo apresentado, porque um mapa vazio no primeiro dia não mostra que a rede
existe.

O que sustenta a decisão, e **não pode ser afrouxado junto**: o mapa conhece
apenas o município (P-001 continua intacto), a pessoa é avisada no formulário de
que vai aparecer, e sair é imediato. Quem já tinha perfil não foi migrado — ligar
o mapa de quem escolheu ficar fora seria desfazer a decisão dela pelas costas.

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
