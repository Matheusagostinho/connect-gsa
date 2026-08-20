# Spec: Convite aberto, com prazo curto

> feature: convite-aberto
> status: implementada

## Contexto

O convite era de **uso único** desde a primeira fatia, e essa era a trava que
fazia a rede ser fechada: um link, uma pessoa. Um embaixador que quisesse trazer
as quarenta pessoas do capítulo dele precisava de quarenta links, e o teto lhe
dava cinco a cada trinta dias.

**A decisão do dono do produto foi abrir o convite:** ele passa a valer para
quantas pessoas receberem o link, até expirar.

O custo foi apresentado antes e está registrado no P-009 — repetido aqui porque
uma spec que só conta o lado bom da decisão é propaganda, não especificação:

> O uso único era o que continha um link vazado, e ele não existe mais. Um link
> colado num grupo de trezentas pessoas entrega trezentos acessos, e nenhuma
> outra camada impede isso.

**O dono do produto avaliou esse custo e o aceitou**, com o raciocínio registrado
aqui para quem ler depois não achar que foi descuido:

- O link é divulgado **num grupo fechado do programa**, não em rede aberta.
- O ConnectGSA **não é produto oficial** do Google nem do programa. Um acesso
  indevido não compromete sistema de terceiro.
- **O que não pode vazar é dado pessoal** — e essa fronteira não foi afrouxada
  junto: e-mail continua sem sair da API (P-002), localização continua sendo só o
  município (P-001), e imagem continua sendo reprocessada sem EXIF.

A consequência que fica, e que não some por decisão: quem entra por um convite
vazado **vê o diretório** — nome, instituição, cidade, curso, habilidades e links
de todo mundo. É pouco para um grupo fechado do programa e não é nada. É o que
torna a revogação desejável, não urgente.

O que fica no lugar são dois freios mais fracos, e a spec assume os dois:

1. **O prazo caiu de 30 para 15 dias.** Ele não contém o vazamento rápido — o
   grupo de WhatsApp entrega os trezentos acessos em duas horas, não em quinze
   dias. O que ele contém é o vazamento LENTO: o print esquecido, o convite no
   e-mail de alguém que largou a conta. Para esse, prazo curto é a defesa certa.
2. **O teto de criação por período continua** (5 a cada 30 dias para embaixador
   comum). Ele já não segurava o portão antes e segura menos agora, mas limita a
   quantos links distintos uma conta comprometida consegue pôr na rua.

**O que NÃO foi afrouxado junto**, e não pode ser sem decisão própria: o código
continua vindo de gerador criptográfico e guardado só como hash, a recusa
continua sendo a mesma mensagem para todo motivo, o limite de tentativas
continua valendo, e a página do convite continua devolvendo só o primeiro nome
de quem convidou.

## Histórias

### US-063 — Trazer o capítulo inteiro com um link só

Como embaixador, quero mandar um convite que sirva para várias pessoas, para não
precisar gerar um link por pessoa.

#### AC-146 — O mesmo convite atende mais de uma pessoa

- **Dado** um convite válido que outra pessoa já usou
- **Quando** eu entro com ele
- **Então** eu entro também — e as duas contas existem

#### AC-147 — Sob corrida, todas as tentativas passam

- **Dado** um convite válido usado por várias tentativas ao mesmo tempo
- **Quando** elas rodam em paralelo
- **Então** nenhuma é recusada — a reserva atômica saiu, e a ausência dela não
  pode ter introduzido erro sob concorrência

#### AC-148 — Cada pessoa que entra fica indicada por quem gerou o link

- **Dado** que três pessoas entraram pelo meu convite
- **Quando** conto minhas indicações
- **Então** são três — a indicação é por PESSOA, não por convite

#### AC-149 — O convite nasce valendo 15 dias

- **Dado** que gero um convite sem dizer por quanto tempo
- **Quando** olho a validade dele
- **Então** ela é de 15 dias — o prazo é o que sobrou segurando o portão

#### AC-150 — Convite vencido continua recusado, com a mesma mensagem

- **Dado** um convite cuja data já passou e um código que nunca existiu
- **Quando** tento entrar com cada um
- **Então** os dois recebem a MESMA recusa — distinguir os dois entregaria de
  graça o oráculo que o limite de tentativas existe para negar

## Fora de escopo

- **Revogar um convite.** É a companhia natural desta mudança e está fora de
  propósito, não por esquecimento: sem uso único, revogar é o único jeito de
  estancar um link vazado antes dos 15 dias. Exige rota, listagem dos convites
  ativos na tela e decisão sobre o que acontece com quem já entrou. Fica para
  depois do lançamento — o dono do produto avaliou o risco e ele não é
  bloqueante no cenário de divulgação em grupo fechado.
- Teto de usos por convite (o link atender N pessoas em vez de infinitas). Foi
  oferecido e recusado; volta a valer se a revogação não bastar.
- Ver quantas pessoas entraram por CADA link. Hoje a tela mostra o total de
  indicações da pessoa, não a quebra por convite — e a quebra só faz sentido
  junto com a listagem que a revogação vai exigir.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-055 | 15 dias é o prazo. Menos atrapalha quem manda o convite e demora a responder; mais devolve a janela que a mudança abriu | confirmada | `INVITE_VALIDITY_DAYS` |
| ASM-056 | `usedAt` vira `lastUsedAt`. Num convite que atende várias pessoas, "usado em" sugere que ele acabou ali | confirmada | Renomeado na migração |
| ASM-057 | O vínculo "entrei por este convite" muda de lado: sai de `InviteCode.usedById` e vira `User.invitedViaId`, porque o lado "muitos" passou a ser o do usuário | confirmada | Migração `20260820100000_convite_aberto` |
| ASM-058 | Convites já emitidos e em aberto são encurtados para 15 dias pela migração, menos os que já venciam antes disso | confirmada | Passo 5 da migração |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-035 | A revogação de convite entra antes do lançamento público? Sem ela, um link vazado fica de pé por 15 dias | respondida | **Não bloqueia.** Decisão do dono do produto: o link é divulgado em grupo fechado do programa, o ConnectGSA não é produto oficial, e o que precisa continuar protegido é dado pessoal — que não foi afrouxado. Entra depois do lançamento. O risco aceito está escrito no Contexto, com nome: quem entrar por um link vazado vê o diretório |
| Q-036 | O teto de 5 a cada 30 dias ainda faz sentido quando cada link é ilimitado? Ele passou a limitar links, não pessoas | respondida | Mantido como está, e reavaliado junto com a revogação (Q-035). Mexer no teto na mesma fatia que tirou o uso único seria trocar dois freios de uma vez, e aí nenhum efeito observado poderia ser atribuído a um deles. O que ele limita hoje está escrito sem eufemismo: links distintos, não pessoas |
