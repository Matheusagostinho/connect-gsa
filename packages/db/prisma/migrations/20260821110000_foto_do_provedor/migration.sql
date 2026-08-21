-- Apaga as fotos que apontam para o provedor social.
--
-- O Better Auth gravava `image` com a URL que o Google devolve
-- (`lh3.googleusercontent.com/a/ACg8ocK…`), e esse caminho carrega um
-- identificador derivado da conta Google da pessoa. O campo é servido a
-- qualquer participante que veja o perfil, o diretório, o feed ou um pino do
-- mapa — então o identificador circulava pela rede, e cada avatar renderizado
-- era uma requisição ao Google com o IP de quem estava navegando.
--
-- A partir de agora a foto é trazida para o nosso armazenamento na criação da
-- conta. Para quem já entrou, não dá para recuperar o arquivo original com
-- garantia — e continuar servindo a URL do provedor é o que precisa parar.
--
-- Zerar deixa o avatar recuar para a inicial, que é o comportamento de quem
-- nunca enviou foto. É um degrau visual pequeno, e a pessoa pode enviar a dela
-- em dois toques. O vazamento não teria conserto tão barato.
UPDATE "User"
SET "image" = NULL
WHERE "image" IS NOT NULL
  AND "image" NOT LIKE '%r2.dev%'
  AND "image" NOT LIKE '%/media/%'
  AND "image" ~ '^https?://';
