# Nest Backend Template

Template de API em **NestJS 12** + **TypeORM 1** + **PostgreSQL 17**, rodando como ESM no Node 22, com
a configuração inicial pronta: banco e migrations, logs estruturados, validação, formato padrão de erro,
CORS, health check, cadastro e login com JWT e refresh token rotativo, rotas protegidas, Swagger com a
especificação versionada, seed, testes unitários e e2e com banco próprio, padrões de código, hooks de
commit, CI (com sincronização opcional do Postman) e deploy no Fly.io.

## Usando este template

1. No GitHub, clique em **Use this template** para criar o repositório do novo projeto.
2. Troque os nomes genéricos pelos do projeto:

   | Onde | O quê |
   |---|---|
   | `package.json` | `name` |
   | `fly.toml` | `app` (precisa ser único no Fly) |
   | `.env.example` e `.env.test` | Usuário, senha e nome do banco (`app` / `app_test`) |
   | `docker-compose.yml` | Valores padrão de usuário, senha e banco |
   | `.github/workflows/ci.yml` | Usuário, senha e banco do Postgres do CI |
   | `src/config/swagger.config.ts` | Título e descrição da documentação da API |
   | `src/database/seed/development-users.ts` | E-mails dos usuários de desenvolvimento (opcional) |
   | Este README | Título e descrição |

3. Rode `npm install`: ele instala as dependências e ativa os hooks de commit.
4. Gere um `JWT_SECRET` para o `.env` (`openssl rand -base64 48`).
5. Para sincronizar a documentação com o Postman (opcional), crie no GitHub a variável
   `POSTMAN_COLLECTION_UID` (*Settings → Secrets and variables → Actions → Variables*) e o segredo
   `POSTMAN_API_KEY`. Sem eles, o job do Postman não roda.

## Primeiros passos

Requisitos: Node 22 (`nvm use`), npm 11 e Docker.

```bash
npm install
cp .env.example .env
npm run db:up           # sobe o Postgres no Docker
npm run migration:run   # aplica as migrations
npm run db:seed         # cria os usuários de desenvolvimento
npm run start:dev       # http://localhost:8080
```

## Variáveis de ambiente

O `.env` é carregado por `src/config/load-env.ts` (`process.loadEnvFile` do próprio Node), que é o
primeiro import do `main.ts`, do `data-source.ts` e dos testes e2e. Variáveis já definidas no ambiente
têm prioridade sobre o `.env`, então em produção e no CI basta exportá-las.

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `POSTGRES_HOST` | sim | | Host do banco |
| `POSTGRES_PORT` | sim | | Porta do banco (também a porta exposta pelo Docker) |
| `POSTGRES_USER` | sim | | Usuário do banco |
| `POSTGRES_PASSWORD` | sim | | Senha do banco |
| `POSTGRES_DB` | sim | | Nome do banco |
| `PORT` | não | `8080` | Porta HTTP da API (a mesma no desenvolvimento local, no Docker e no Fly) |
| `LOG_LEVEL` | não | `info` | Nível mínimo de log (`debug`, `info`, `warn`, `error`) |
| `LOG_PRETTY` | não | `false` | `true` para logs coloridos no terminal; em produção, deixar `false` |
| `JWT_SECRET` | sim | | Segredo que assina o access token (JWT). Mínimo de 32 caracteres; gere com `openssl rand -base64 48` |
| `ACCESS_TOKEN_TTL_SECONDS` | não | `900` | Validade do access token (15 minutos) |
| `REFRESH_TOKEN_TTL_DAYS` | não | `30` | Validade da sessão, renovada a cada refresh |
| `CORS_ORIGINS` | não | `http://localhost:3000` | Origens liberadas no CORS, separadas por vírgula |

Não existe `DATABASE_URL`: a conexão é montada a partir das variáveis `POSTGRES_*`, que são as mesmas
usadas pelo `docker-compose.yml`. Se faltar uma variável obrigatória, a aplicação não sobe e mostra
`Variável de ambiente <NOME> não definida`.

As variáveis são lidas pelo `EnvUtils` (`getRequired` e `getOptional`) e guardadas em constantes
`private static readonly` da classe de configuração que as usa (veja `TypeOrmConfigService` e
`LoggerConfig`).

## Banco de dados

O `docker-compose.yml` sobe um Postgres 17 com healthcheck. Os dados ficam no volume `postgres_data`
e sobrevivem ao `db:down`.

```bash
npm run db:up     # sobe em background
npm run db:down   # derruba o container (mantém os dados)
npm run db:logs   # acompanha os logs
```

Para usar outra porta (se a 5432 estiver ocupada), mude `POSTGRES_PORT` no `.env`.

### Usuários de desenvolvimento (seed)

```bash
npm run db:seed
```

Cria no banco local, se ainda não existirem (pode rodar quantas vezes quiser):

| E-mail | Senha | Papel |
|---|---|---|
| `user@app.local` | `senha-de-dev` | `USER` |
| `admin@app.local` | `senha-de-dev` | `ADMIN` |

- Usa os próprios services da aplicação (hash da senha, regras de e-mail).
- Recusa rodar com `NODE_ENV=production`.
- Os dados ficam em `DevelopmentUsers` (`src/database/seed/development-users.ts`), que também alimenta o
  exemplo do `LoginDto`: o login do Swagger e do Postman já vem preenchido com o usuário do seed.

### Convenções do banco

- **Nomes em `snake_case`** no banco (`data_nascimento`, `evento_id`) e `camelCase` no código
  (`dataNascimento`). A conversão é automática pelo `SnakeNamingStrategy`
  (`src/database/snake-naming.strategy.ts`), inclusive para chaves estrangeiras e tabelas de junção.
- **Toda entidade estende `AbstractEntity`** (`src/database/abstract-entity.ts`), que define:

  | Coluna | Tipo | Uso |
  |---|---|---|
  | `id` | `bigint` (identity) | Chave primária interna: relacionamentos e `JOIN`s. **Nunca sai da API.** |
  | `public_id` | `uuid` (`gen_random_uuid()`, `UNIQUE`) | Identificador exposto na API |
  | `created_at` | `timestamptz` | Preenchida na criação |
  | `updated_at` | `timestamptz` | Atualizada a cada alteração |
  | `deleted_at` | `timestamptz` (nulo enquanto ativo) | Soft delete |
  | `version` | `integer` | Começa em 1 e incrementa a cada alteração |

- **`id` interno x `public_id`:**
  - Respostas da API sempre passam por um DTO; nunca devolva a entidade direto, para o `id` interno
    não vazar. No JSON, o `public_id` é exposto com o nome `id`.
  - Buscas vindas da API são feitas por `public_id`. Referências recebidas (ex.: o `eventoId` de uma
    inscrição) são convertidas para o `id` interno antes de gravar.
  - O `bigint` chega no código como `string` (o driver do Postgres não o converte para `number` para
    não perder precisão).
- **Datas sempre em `timestamptz`**, guardadas em UTC. A conexão força o fuso da sessão para UTC
  (`-c timezone=UTC`), então SQL escrito à mão também enxerga UTC.
- **Soft delete com `deleted_at`:**
  - Use `repositorio.softDelete(...)` e `repositorio.restore(...)`. Os métodos `find*` ignoram
    registros apagados; para incluí-los, passe `withDeleted: true`.
  - SQL escrito à mão (`query`, `createQueryBuilder` com SQL cru) **não** filtra sozinho: inclua
    `deleted_at IS NULL`.
  - Colunas `UNIQUE` de negócio (ex.: CPF) também barram registros apagados. Nesses casos, use índice
    único parcial: `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`.
  - Soft delete mantém os dados pessoais no banco. Pedidos de exclusão pela LGPD exigem anonimizar ou
    apagar de verdade.
- **`version` ainda não protege contra edição coa pncorrente:**
  - Diferente do `@Version` do Spring/Hibernate, o `save()` do TypeORM não faz `WHERE version = ?`.
    Testado: um `save()` com versão desatualizada sobrescreve a alteração mais recente sem erro e ainda
    grava a versão antiga de volta.
  - A checagem (`UPDATE ... WHERE id = ? AND version = ?`, com erro de conflito quando nenhuma linha
    muda) será implementada quando surgir o primeiro caso real, como dois administradores editando o
    mesmo evento.
  - Para disputa por estoque (vagas, lotes de ingresso), não use `version`: use `UPDATE` atômico
    (`SET vagas = vagas - 1 WHERE vagas > 0`) ou lock de linha (`FOR UPDATE`).
- O `public_id` usa `@Generated('uuid')` com `uuidExtension: 'pgcrypto'` (gera `gen_random_uuid()`, nativo
  do Postgres 13+) e `installExtensions: false`. Declarar o mesmo valor com `default` faria o TypeORM
  enxergar uma diferença inexistente e repetir a alteração em todo `migration:generate`.
- Entidades que se referenciam (ex.: `User` ↔ `Profile`) usam o tipo `Relation<...>` nas
  propriedades de relação; sem ele, o ESM pode falhar com `Cannot access 'User' before initialization`.
- Enums ficam em colunas `varchar` validadas pela aplicação, não em `enum` do Postgres (difícil de
  alterar depois).
- Declare sempre o `type` das colunas (`@Column({ type: 'varchar' })`), para o schema ficar explícito.

```ts
@Entity()
export class Inscricao extends AbstractEntity {

  @Column({ type: 'varchar' })
  nomeAtleta: string;
}
```

### Usuários

| Entidade / tabela | Campos |
|---|---|
| `User` / `users` | `email` (único entre ativos), `passwordHash`, `role` (`USER` ou `ADMIN`), `emailVerifiedAt`, `lastLoginAt` |

- A tabela se chama `users` (plural) porque `user` é palavra reservada no Postgres.
- **`UsersService`** (`src/users/users.service.ts`), exportado pelo `UsersModule`:
  - `createUser(data)` cria a conta com papel `USER` (usado pelo cadastro público); `createAdmin(data)`
    cria com papel `ADMIN` e nunca é exposto por rota pública: o cadastro não aceita o campo `role`, e
    admins são criados por comando interno ou pelo seed.
  - Os dois guardam o e-mail sem espaços e em minúsculas e recusam e-mail já usado por um registro ativo
    com `409 Conflict` (`E-mail já cadastrado`). Se dois cadastros simultâneos passarem pela checagem,
    o índice único do banco barra e a resposta também é 409 (veja "Formato de erro").
  - `findByEmail(email)` ignora espaços e maiúsculas; `findByPublicId(publicId)` busca pelo id público.
    Registros apagados (soft delete) não são encontrados.
  - O service recebe a senha já com hash (`CreateUserData`): gerar e conferir o hash é responsabilidade
    da autenticação.
- **`UserResponseDto`** (`src/users/dto/`): não expõe `passwordHash`, `lastLoginAt`, `version` nem o id
  interno.
- Para dados além da conta (perfil, endereço...), crie uma entidade própria ligada 1:1 ao `User` e grave
  as duas no mesmo método `@Transactional()`: assim a conta fica separada dos dados pessoais, o que
  facilita anonimizar por LGPD.

### Transações

Métodos anotados com **`@Transactional()`** (`src/database/transaction/`) rodam numa transação, como no
Spring:

```ts
@Injectable()
export class UsersService {

  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

  @Transactional()
  async create(...) {
    await this.usersRepository.save(...);  // tudo aqui dentro é confirmado junto ou desfeito junto
  }
}
```

- **Sem erro**, a transação é confirmada no fim do método; **qualquer erro** desfaz tudo.
- **Participa da transação existente** (como o `REQUIRED` do Spring): um método `@Transactional` chamado
  por outro roda na mesma transação, e uma falha no externo desfaz o interno.
- Diferente do Spring, funciona também quando o método é chamado pela própria classe
  (`this.metodo()`), inclusive em métodos `private`.
- **Repositórios:** importe as entidades com `DatabaseModule.forFeature([...])` em vez de
  `TypeOrmModule.forFeature`. Os repositórios injetados com `@InjectRepository` passam a usar
  automaticamente a transação em andamento (ou a conexão normal, fora dela).
- **Limites:** só funciona em métodos `async`; SQL executado direto pelo `DataSource`
  (`dataSource.query(...)`, `dataSource.getRepository(...)`) fica fora da transação.
- Como funciona: o `TransactionManager` guarda a transação atual num `AsyncLocalStorage` (o
  "ThreadLocal" do Node), e os repositórios do `DatabaseModule` consultam esse contexto a cada chamada.
  Os `DataSource`s ficam numa pilha: um script que sobe outra instância da aplicação (como o seed) usa a
  dele enquanto está aberto, e a aplicação volta a usar a própria quando o script termina.

### Autenticação

- **`POST /api/v1/auth/register`** (`AuthController`) cadastra um usuário com papel `USER`. Responde
  `201` com o `UserResponseDto`, `400` com os campos inválidos e `409` para e-mail já cadastrado.
- O corpo é o `RegisterDto`: `email` e `password` (8 a 128 caracteres). Não existe campo `role`:
  enviá-lo resulta em `400`, então ninguém se cadastra como admin.
- A senha é guardada com **argon2id** pelo `PasswordHasher` (`@node-rs/argon2`, com binários prontos
  inclusive para o Alpine do Docker), nos parâmetros recomendados pelo OWASP (19 MiB, 2 iterações).
- Para projetos brasileiros, o `@IsCpf()` (`src/validation/cpf.validator.ts`) valida CPFs pelos dígitos
  verificadores e recusa os que têm todos os dígitos iguais.
- E-mails passam por `@NormalizeEmail()` antes da validação: espaços nas pontas e maiúsculas não
  impedem o cadastro nem o login.

**Login, renovação e logout:**

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /auth/login` | `email`, `password` | `200` com os tokens; `401` `E-mail ou senha inválidos` |
| `POST /auth/refresh` | `refreshToken` | `200` com um **novo** par de tokens; `401` `Sessão inválida ou expirada` |
| `POST /auth/logout` | `refreshToken` | `204`, sempre (não revela se a sessão existia) |

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "accessTokenExpiresIn": 900,
  "refreshToken": "0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10.Qm9h...",
  "refreshTokenExpiresAt": "2026-11-04T12:00:00.000Z"
}
```

- **Access token:** JWT (HS256) de 15 minutos com `sub` (o `publicId` do usuário), `role` e `sid` (o
  `publicId` da sessão). Nunca leva o `id` interno.
- **Refresh token:** valor aleatório opaco no formato `<publicId da sessão>.<segredo>`. A tabela
  `session` guarda só o hash SHA-256 do segredo (como é aleatório e longo, não precisa de hash lento).
- **Rotação:** cada `refresh` invalida o token usado e devolve outro. Reusar um token antigo é tratado
  como roubo: a sessão inteira é encerrada. Duas renovações simultâneas com o mesmo token não geram
  duas sessões válidas (a troca é um `UPDATE` condicional).
- **Login seguro contra enumeração:** e-mail inexistente e senha errada dão a mesma resposta, e o
  e-mail inexistente também passa pela conferência de senha (contra um hash de referência), para o
  tempo de resposta não denunciar quais e-mails estão cadastrados.
- Cada login abre uma sessão própria (celular e computador ficam independentes); o logout encerra só
  a sessão do token informado. A sessão registra `user_agent` e `ip`.
- Atrás do proxy do Fly, o `ip` registrado será o do proxy até configurarmos o `trust proxy`.

**Proteção das rotas (passport):**

- **Toda rota exige login por padrão.** O `JwtAuthGuard` (global, registrado no `AuthModule`) usa o
  `passport-jwt`: lê o `Authorization: Bearer`, confere assinatura (só HS256) e validade, e carrega o
  usuário pelo `sub` do token. Token ausente, malformado, vencido, assinado com outro segredo, sem
  assinatura (`alg: none`) ou de usuário apagado resulta em `401` (Problem Details) com a mesma
  mensagem, pronta para mostrar ao usuário e sem revelar o motivo da recusa: `Faça login para continuar`.
- **Rotas abertas** recebem `@Public()` (na classe ou no método): hoje o health e as de `/auth/`.
- **`@CurrentUser()`** entrega ao controller o usuário logado:

  ```ts
  @Get('me')
  me(@CurrentUser() user: User): UserResponseDto {
    return new UserResponseDto(user);
  }
  ```

- No Swagger, controllers protegidos recebem `@ApiBearerAuth()`; use o botão **Authorize** com o
  `accessToken` do login.
- O access token continua válido até vencer (15 minutos) mesmo depois do logout: o logout encerra a
  sessão e impede renovações, mas não invalida tokens já emitidos.
- O passport guarda as estratégias num registro global: uma segunda instância da aplicação com o
  `AuthModule` no mesmo processo substituiria a estratégia da primeira. Por isso o seed usa um
  `SeedModule` enxuto, sem autenticação. Scripts que precisarem subir a aplicação devem fazer o mesmo.
- `@Roles()` entra com a primeira rota exclusiva de admin.

## Migrations

O `synchronize` do TypeORM está desligado: toda mudança no banco passa por uma migration em
`src/database/migrations/`.

```bash
npm run migration:create --name=CriarEventos    # migration vazia
npm run migration:generate --name=CriarEventos  # gera o SQL a partir das entidades
npm run migration:run
npm run migration:revert
```

- Os scripts rodam a CLI do TypeORM sobre o código compilado em `dist/` (cada um faz `build` antes).
  Isso é necessário porque o TypeORM depende do `emitDecoratorMetadata` do `tsc` para descobrir o tipo
  das colunas, o que `tsx` e o TypeScript nativo do Node não geram.
- Revise o SQL gerado antes de commitar: o `migration:generate` compara as entidades com o banco de
  desenvolvimento, então rode `npm run migration:run` antes, para o banco estar em dia.
- O `migration:generate` já entrega a migration no padrão do projeto: depois de gerar, ele roda o
  `migration:format` (`scripts/format-migrations.mjs`), que acrescenta o `public` no campo `name` (o
  TypeORM gera sem visibilidade) e passa o `eslint --fix` na pasta das migrations.
- O teste `test/e2e/database/migrations.e2e-spec.ts` falha se alguma entidade tiver mudança sem
  migration correspondente.
- Entidades ficam em arquivos `*.entity.ts`. Na aplicação, são registradas por módulo com
  `TypeOrmModule.forFeature([...])` (`autoLoadEntities`). A CLI as encontra pelo padrão
  `dist/**/*.entity.js`, definido em `src/database/data-source.ts`.

## API

- Padrão **REST**.
- Todas as rotas ficam sob **`/api/v1/`** (ex.: `GET /api/v1/eventos`). O prefixo e a versão são
  aplicados pelo `HttpConfig` (`src/config/http.config.ts`), usado pelo `main.ts` e pelos testes e2e.
  Rotas fora do prefixo respondem 404.
- A versão usa o versionamento por URI do Nest: se um dia existir uma `v2`, ela é habilitada por
  controller (`@Controller({ version: '2' })`) sem mudar as rotas da `v1`.

### Endpoints

| Método | Rota | Acesso | Situação |
|---|---|---|---|
| GET | `/api/v1/health` | Público | ✅ Pronto |
| POST | `/api/v1/auth/register` | Público | ✅ Pronto |
| POST | `/api/v1/auth/login` | Público | ✅ Pronto |
| POST | `/api/v1/auth/refresh` | Público (usa o refresh token) | ✅ Pronto |
| POST | `/api/v1/auth/logout` | Público (usa o refresh token) | ✅ Pronto |
| GET | `/api/v1/users/me` | Logado | ✅ Pronto |

### Documentação da API (Swagger)

Com a API rodando fora de produção:

- **`http://localhost:8080/api/docs`**: página interativa. Use **Try it out** para chamar os endpoints e
  **Authorize** para colar o token de login nas rotas protegidas.
- **`http://localhost:8080/api/docs-json`**: especificação OpenAPI. O Postman e o Insomnia importam
  essa URL e geram a coleção; reimporte quando a API mudar.

**Especificação versionada:** o arquivo `backend/openapi.json` guarda a documentação da API no
repositório. Os PRs mostram no diff o que mudou na API, e o arquivo serve para importar no Postman ou
gerar o cliente do frontend.

```bash
npm run openapi:export   # gera o openapi.json (sem banco e sem subir o servidor)
npm run openapi:check    # gera e falha se o arquivo versionado estiver desatualizado (roda no CI)
```

Sempre que mudar uma rota ou um DTO, rode `npm run openapi:export` e commite o `openapi.json` junto.
O exportador (`src/openapi/export-openapi.ts`) monta a aplicação no modo de pré-visualização do Nest,
que não executa os providers nem conecta no banco; variáveis obrigatórias ausentes recebem valores
de exemplo, usados só para gerar o arquivo.

**Postman sincronizado:** a cada push na `master`, depois que o job do backend confirma que o
`openapi.json` está em dia, o job **Postman** do CI converte o arquivo (`openapi-to-postmanv2`, o
conversor oficial) e **substitui** a coleção configurada pela API do Postman. Ninguém precisa
importar nada.

- A chave fica no segredo `POSTMAN_API_KEY` do GitHub (use uma chave de conta de serviço ou do admin do
  time, não a pessoal de um dev) e o UID da coleção na variável `POSTMAN_COLLECTION_UID`. Sem a
  variável, o job não roda; sem a chave, só avisa.
- Só o CI atualiza a coleção do time: quem está numa branch testa pelo Swagger local.
- A coleção é recriada a cada sincronização, então não edite nela. Guarde a URL e o token num
  **ambiente** do Postman (com o token no *current value*, que não é compartilhado) e monte fluxos
  próprios numa coleção separada.
- As requisições usam `{{baseUrl}}` (padrão `http://localhost:8080`); um `baseUrl` definido no ambiente
  tem prioridade.
- **Login automático:** a coleção usa `Bearer {{accessToken}}` em todas as requisições e tem um script
  (`backend/postman/auto-login.js`) que roda antes de cada uma, exceto as de `/auth/`. Sem token, ou com
  ele a menos de 30s de vencer, o script faz login com `{{email}}` e `{{password}}` e usa o token novo.
  - Com um **ambiente** selecionado, o token é guardado no *current value* (não compartilhado) e
    reaproveitado até vencer; sem ambiente, o script faz login a cada requisição.
  - `email` e `password` vêm por padrão com o usuário do seed (lidos dos exemplos do `LoginDto` no
    `openapi.json`). Para testar como admin, defina no ambiente `email = admin@app.local`.
  - As requisições não têm autenticação própria (o conversor colocaria `{{bearerToken}}` nas rotas
    protegidas); todas herdam o `Bearer {{accessToken}}` da coleção.
  - A montagem da coleção (variáveis, autenticação e script) fica em `backend/postman/collection.jq`,
    o mesmo usado no CI e para testar localmente com o Newman.
- Os bodies vêm dos `example` dos DTOs (`@ApiProperty({ example })`): o login usa o usuário do seed e o
  cadastro usa outro e-mail, para não esbarrar no seed. Para mudar um body, mude o exemplo
  no DTO, não na coleção.
- O exportador e os testes dependem dos exemplos dos DTOs de entrada: o teste do seed usa os exemplos da
  documentação como corpo real de login e cadastro, garantindo que continuam válidos.

A documentação fica desligada quando `NODE_ENV=production` (como no `Dockerfile`), para não expor o mapa
da API.

O plugin do Swagger no `nest-cli.json` (`esmCompatible` + `classValidatorShim`) documenta os DTOs
(`*.dto.ts`) a partir dos tipos e das validações do `class-validator`, sem decorators extras. Nos
controllers, use:

```ts
@ApiTags('auth')
@Controller('auth')
export class AuthController {

  @Post('login')
  @ApiOperation({ summary: 'Autentica com e-mail e senha' })
  @ApiUnauthorizedResponse({ type: ProblemDetails })
  login(@Body() body: LoginDto): Promise<TokensResponseDto> { ... }
}
```

- Rotas protegidas recebem `@ApiBearerAuth()`.
- Respostas de erro usam o esquema `ProblemDetails`, já registrado na documentação.
- O plugin roda no `nest build` e no `start:dev`, mas não nos testes (o Vitest não passa por ele). Por
  isso os testes do Swagger conferem rotas e esquemas com `@ApiProperty` explícito, não campos que só o
  plugin documenta.

### DTOs de resposta

Controllers **nunca** devolvem entidades. Toda resposta é um DTO que estende `AbstractResponseDto`
(`src/http/abstract-response.dto.ts`), que já expõe o `public_id` com o nome `id`, mais `createdAt` e
`updatedAt`. Os demais campos são copiados explicitamente no construtor, então só sai o que foi
escolhido (nada de `cpf`, `version` ou o `id` interno por acidente):

```ts
export class EventoResponseDto extends AbstractResponseDto {

  readonly nome: string;

  constructor(evento: Evento) {
    super(evento);
    this.nome = evento.nome;
  }
}
```

Como proteção, o `EntityLeakInterceptor` (global) verifica cada resposta, inclusive listas e objetos
aninhados. Se encontrar uma entidade, a requisição falha com 500 genérico para o cliente e o log
indica a entidade: `A entidade Evento foi devolvida na resposta; converta para um DTO`.

### CORS

Só as origens de `CORS_ORIGINS` podem chamar a API pelo navegador (padrão: o frontend em
`http://localhost:3000`). O cabeçalho `x-request-id` é exposto para o frontend conseguir lê-lo.
Para o `npm run dev:https` do frontend, acrescente a origem https dele, por exemplo:
`CORS_ORIGINS=http://localhost:3000,https://192.168.1.13:3000`.

### Health check

`GET /api/v1/health` (`@nestjs/terminus`) verifica a conexão com o banco:

- 200 com `{ "status": "ok", "info": { "database": { "status": "up" } } }` quando tudo está no ar;
- 503 em Problem Details quando o banco está fora. A resposta não diz qual dependência falhou, para não
  expor detalhes da infraestrutura.

### Validação das requisições

Os DTOs são validados com **`class-validator`** pelo `ValidationPipe` global (configurado no
`HttpConfig`):

```ts
export class CriarInscricaoDto {

  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => AtletaDto)
  atleta: AtletaDto;
}
```

- **`whitelist` + `forbidNonWhitelisted`:** campos que não existem no DTO são recusados com 400 (evita,
  por exemplo, alguém enviar `admin: true`).
- **`transform`:** o controller recebe uma instância do DTO, não um objeto genérico.
- Objetos aninhados precisam de `@ValidateNested()` e `@Type(() => Classe)`; sem eles, o conteúdo não
  é validado.
- As mensagens padrão do `class-validator` são em inglês (`email must be an email`). Para mensagens em
  português, passe `message` no decorator: `@IsEmail({}, { message: 'e-mail inválido' })`.

### Formato de erro

Todos os erros saem no formato **Problem Details** ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)),
o mesmo do `ProblemDetail` do Spring, com `Content-Type: application/problem+json`. Quem faz a
conversão é o `ProblemDetailsFilter` (`src/http/problem-details.filter.ts`).

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Os dados enviados são inválidos",
  "instance": "/api/v1/inscricoes",
  "requestId": "4f1c...",
  "errors": [
    { "field": "atleta.cpf", "message": "cpf must match /^\\d{11}$/ regular expression" }
  ]
}
```

| Situação | Status | `detail` |
|---|---|---|
| Campos inválidos | 400 | `Os dados enviados são inválidos`, com a lista em `errors` |
| JSON malformado | 400 | Mensagem do parser |
| Exceções HTTP do Nest (`NotFoundException('Evento não encontrado')` etc.) | O da exceção | A mensagem da exceção |
| Rota inexistente | 404 | `Cannot GET /api/v1/...` |
| Registro duplicado barrado por índice único do banco | 409 | `Já existe um registro com esses dados` (sem expor o SQL) |
| Qualquer outro erro | 500 | `Erro interno no servidor` (o erro real vai só para o log, com stack trace) |

- Para erros de negócio, lance as exceções HTTP do Nest com uma mensagem clara; ela chega ao cliente
  em `detail`.
- Violações de índice único (código `23505` do Postgres) viram 409 no próprio filtro, reconhecidas por
  `DatabaseError.isUniqueViolation` (`src/database/database-error.ts`). Services não precisam tratar
  esse erro: basta checar antes (para dar uma mensagem específica) e deixar o índice barrar os casos
  simultâneos.
- O `requestId` permite achar nos logs tudo o que aconteceu naquela requisição. No caso de JSON
  malformado ele não aparece, porque o corpo é lido antes do middleware de log gerar o id.

## Logs

Os logs usam **pino** (`nestjs-pino`), configurado em `src/logger/logger.config.ts`. O `Logger` do
Nest também grava pelo pino, então basta usar:

```ts
private readonly logger = new Logger(MeuService.name);
```

- **Formato:** JSON, uma linha por evento (produção), ou colorido com `LOG_PRETTY=true` (dev).
- **Request id:** cada requisição recebe um id, devolvido no cabeçalho `x-request-id` e presente em
  todos os logs dela. Se o cliente enviar um `x-request-id` válido (letras, números, `_` e `-`, até
  128 caracteres), ele é reaproveitado; caso contrário, é gerado um UUID.
- **Log de requisições:** método, rota, status e tempo de resposta são registrados automaticamente.
  O corpo da requisição **não** é registrado.
  O health check (`/api/v1/health`) fica de fora, para não encher o log com as chamadas dos monitores;
  ele continua recebendo `x-request-id`.
- **Dados ocultos:** `authorization`, `cookie`, `set-cookie`, `cpf`, `password` e `apiKey` aparecem
  como `[Redacted]`. Os campos são ocultados no primeiro nível e um nível abaixo (`cpf`,
  `atleta.cpf`); para objetos mais profundos, acrescente o caminho em `REDACTED_PATHS`.

## Docker e deploy (Fly.io)

O `Dockerfile` gera a imagem de produção em dois estágios: o primeiro instala tudo e compila; o final
leva só o `dist/`, as dependências de produção e o `package.json` (necessário para o ESM). A imagem
roda como usuário `node` (não root), em `NODE_ENV=production`, na porta `8080`, a mesma do
desenvolvimento local e a padrão do Fly. O `.dockerignore`
mantém fora da imagem o `.env`, os testes, o código-fonte e o `node_modules` local.

```bash
docker build -t nest-backend-template .
docker run --rm -p 8080:8080 --env-file .env.producao nest-backend-template
```

Dentro do container não existe `.env`: as variáveis vêm do ambiente (no Fly, dos *secrets*).

O deploy será no **Fly.io**, configurado em `fly.toml`:

- Região `gru` (São Paulo), porta interna `8080` e https obrigatório.
- Health check em `/api/v1/health` a cada 30s.
- `release_command` roda `npm run migration:run:prod` antes de cada deploy, com a imagem nova. Se a
  migration falhar, o deploy é cancelado.
- `min_machines_running = 1`: sempre há uma máquina ligada, para o webhook de pagamento não esperar a
  máquina acordar.
- Desligamento seguro (`enableShutdownHooks`): ao receber o sinal de parada, a aplicação fecha as
  conexões e encerra em menos de 1s.

Primeiro deploy:

```bash
fly apps create nome-do-app
fly secrets set POSTGRES_HOST=... POSTGRES_PORT=5432 POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=... CORS_ORIGINS=https://... JWT_SECRET="$(openssl rand -base64 48)"
fly deploy
```

O CI faz o build da imagem em todo push (job **Docker**), para o `Dockerfile` não quebrar sem ninguém
perceber.

## Testes

```bash
npm test            # unitários
npm run test:e2e    # e2e (precisa do Postgres rodando: npm run db:up)
npm run test:cov    # cobertura
```

- Os testes **nunca** ficam em `src/`. Unitários ficam em `test/unit/`, espelhando a estrutura de
  `src/` (ex.: `src/utils/env.utils.ts` → `test/unit/utils/env.utils.spec.ts`), e os e2e em
  `test/e2e/*.e2e-spec.ts`.
- **Os e2e rodam num banco separado, `app_test`**, no mesmo container do Postgres:
  - O `.env.test` (versionado) define `POSTGRES_DB=app_test` e tem prioridade sobre o `.env`
    nos e2e (`test/setup/load-test-env.ts`).
  - Antes dos testes, o `test/setup/test-database.ts` cria o banco se ele não existir e roda as
    migrations direto dos arquivos `.ts`, sem precisar de build.
  - Trava de segurança: os e2e se recusam a rodar se `POSTGRES_DB` não terminar em `_test`, para nunca
    apagar dados do banco de desenvolvimento.
- Testes que gravam no banco limpam as tabelas antes de cada caso com
  `DatabaseCleaner.truncateAll(dataSource)` (`test/support/database-cleaner.ts`), que preserva a tabela
  de migrations. Por isso os arquivos e2e rodam um de cada vez (`fileParallelism: false`).
- Testes que precisam de tabelas próprias (sem migration) criam um schema temporário e o apagam ao
  final (veja `test/e2e/database/abstract-entity.e2e-spec.ts`).
- As descrições são em português, no formato `deve ...`, para facilitar a validação das regras de
  negócio:

  ```ts
  it('deve trocar um id com caracteres inválidos por um uuid', () => { ... });
  ```

## Padrões de código

```bash
npm run format        # aplica a formatação (ESLint Stylistic)
npm run format:check  # só verifica
npm run lint          # oxlint
npm run typecheck     # checagem de tipos de src/ e test/ (o Vitest não confere tipos)
```

- Formatação com **ESLint + `@stylistic/eslint-plugin`** (`eslint.config.js`), não Prettier: o
  Prettier remove a linha em branco após o cabeçalho da classe e não tem opção para mantê-la.
- Linhas de até **180 caracteres**. Linhas longas são apontadas, mas não quebradas automaticamente.
  Strings, template strings e URLs não contam.
- **Linha em branco após o cabeçalho da classe** e **entre cada atributo e método**.
- **Linha em branco antes e depois de blocos** (`if`, `for`, `try`...) dentro dos métodos, separando
  a lógica em etapas:

  ```ts
  const existing = await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);

  if (existing.length === 0) {
    await maintenance.query(`CREATE DATABASE "${database}"`);
  }

  await maintenance.destroy();
  ```
- **Sem comentários** no código: prefira nomes que se expliquem.
- **Visibilidade sempre explícita** nos membros de classe: `public`, `private` ou `protected`, inclusive
  em métodos e propriedades públicas (`public me()`, `public readonly id`); o construtor fica sem
  `public`. Garantido pela regra `@typescript-eslint/explicit-member-accessibility`, que aponta o erro
  mas não corrige sozinha: o `npm run format` não adiciona o `public`.
- Campos com repositórios injetados terminam em `Repository` (`usersRepository`,
  `sessionsRepository`), para ficar claro que acessam o banco.
- **Imports com apelido `@/`** apontando para `src/`: use `@/` sempre que o import precisaria de
  `../`; para a mesma pasta ou subpastas, use `./`. Nos testes, sempre `@/`.

  ```ts
  import { EnvUtils } from '@/utils/env.utils.js';
  ```

  O apelido é definido em `paths` no `tsconfig.json`. O `nest build` reescreve para caminhos relativos
  no `dist/`, e o Vitest o resolve pelo `vite-tsconfig-paths`.
  Exceção: o `nest build` não reescreve `import()` dinâmico, então nele use caminho relativo.
- Estilo **orientado a objetos**: classes no lugar de funções soltas, e utilitários como métodos
  estáticos (ex.: `EnvUtils.getRequired`).

O pre-commit (husky + lint-staged, configurado na raiz do monorepo) roda `eslint --fix` e `oxlint` nos
arquivos alterados.

## Commits e CI

Padrão de commits, validado pelo `commitlint` (`commitlint.config.js`) no hook `commit-msg`:

- Conventional Commits **sem escopo**: `feat: ...`, nunca `feat(user): ...`.
- Cabeçalho de até 80 caracteres e nenhuma assinatura do Claude.
- Commits pequenos: um método ou, no máximo, uma classe por commit.

O hook `pre-commit` (husky + lint-staged) roda `eslint --fix` e `oxlint` nos arquivos alterados.

O CI (`.github/workflows/ci.yml`) roda em pushes para a `master` e em PRs: valida as mensagens de
commit do PR; roda formatação, lint, checagem de tipos, build, a checagem do `openapi.json` e os testes
(com Postgres); e faz o build da imagem Docker. Nos pushes para a `master`, se a variável
`POSTMAN_COLLECTION_UID` existir, também atualiza a coleção do Postman (veja "Documentação da API").

## Estrutura

```
src/
├── auth/                              # cadastro, login, sessões e tokens
├── config/
│   ├── load-env.ts                    # carrega o .env antes de tudo
│   ├── swagger.config.ts              # documentação em /api/docs (fora de produção)
│   └── http.config.ts                 # prefixo, versão, CORS, validação, interceptor e filtro de erros
├── database/
│   ├── typeorm-config.service.ts      # conexão com o Postgres
│   ├── snake-naming.strategy.ts       # nomes em snake_case no banco
│   ├── abstract-entity.ts             # colunas comuns a todas as entidades
│   ├── data-source.ts                 # data source usado pela CLI de migrations
│   └── migrations/
├── health/                            # GET /api/v1/health
├── http/
│   ├── abstract-response.dto.ts       # base dos DTOs de resposta (id = public_id)
│   ├── entity-leak.interceptor.ts     # barra entidades devolvidas sem DTO
│   ├── problem-details.filter.ts      # converte qualquer erro em Problem Details
│   ├── problem-details.ts             # formato da resposta de erro
│   └── invalid-fields.exception.ts    # erro 400 com a lista de campos inválidos
├── logger/logger.config.ts
├── openapi/export-openapi.ts           # gera o openapi.json versionado            # pino: formato, request id e dados ocultos
├── users/                             # User, UsersService, controller e DTOs
├── utils/env.utils.ts
├── validation/                        # validadores do class-validator (ex.: @IsCpf)                 # leitura de variáveis de ambiente
├── app.module.ts
└── main.ts
test/
├── unit/                              # espelha src/
├── e2e/
├── setup/                             # ambiente e banco de teste dos e2e
└── support/                           # utilitários dos testes (ex.: DatabaseCleaner)
```

## Scripts

| Script | O que faz |
|---|---|
| `start:dev` | Sobe a API com reload automático |
| `start:prod` | Sobe a partir do `dist/` |
| `build` | Compila para `dist/` |
| `db:up` / `db:down` / `db:logs` | Controla o Postgres no Docker |
| `db:seed` | Cria os usuários de desenvolvimento |
| `migration:create` / `generate` / `run` / `revert` | Migrations do TypeORM |
| `migration:format` | Ajusta as migrations ao padrão do projeto (roda sozinho no `generate`) |
| `migration:run:prod` | Roda as migrations sem build, sobre o `dist/` (usado no deploy) |
| `test` / `test:e2e` / `test:cov` | Testes com Vitest |
| `format` / `format:check` | Formatação com ESLint Stylistic |
| `lint` | Lint com oxlint |
| `typecheck` | Checagem de tipos de `src/` e `test/` |
| `openapi:export` / `openapi:check` | Gera o `openapi.json` / confere se está atualizado |
