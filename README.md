# Nest Backend Template

Template de API em **NestJS 12** + **TypeORM 1** + **PostgreSQL 17**, rodando como ESM no Node 22, com
a configuração inicial pronta: banco e migrations, logs estruturados, validação, formato padrão de erro,
CORS, health check, testes unitários e e2e com banco próprio, padrões de código, hooks de commit, CI e
deploy no Fly.io.

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
   | Este README | Título e descrição |

3. Rode `npm install`: ele instala as dependências e ativa os hooks de commit.

## Primeiros passos

Requisitos: Node 22 (`nvm use`) e Docker.

```bash
npm install
cp .env.example .env
npm run db:up           # sobe o Postgres no Docker
npm run migration:run   # aplica as migrations
npm run start:dev       # http://localhost:3333
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
| `LOG_LEVEL` | não | `info` | Nível mínimo de log (`debug`, `info`, `warn`, `error`) |
| `LOG_PRETTY` | não | `false` | `true` para logs coloridos no terminal; em produção, deixar `false` |
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
- **`version` ainda não protege contra edição concorrente:**
  - Diferente do `@Version` do Spring/Hibernate, o `save()` do TypeORM não faz `WHERE version = ?`.
    Testado: um `save()` com versão desatualizada sobrescreve a alteração mais recente sem erro e ainda
    grava a versão antiga de volta.
  - A checagem (`UPDATE ... WHERE id = ? AND version = ?`, com erro de conflito quando nenhuma linha
    muda) será implementada quando surgir o primeiro caso real, como dois administradores editando o
    mesmo evento.
  - Para disputa por estoque (vagas, lotes de ingresso), não use `version`: use `UPDATE` atômico
    (`SET vagas = vagas - 1 WHERE vagas > 0`) ou lock de linha (`FOR UPDATE`).
- Declare sempre o `type` das colunas (`@Column({ type: 'varchar' })`), para o schema ficar explícito.

```ts
@Entity()
export class Inscricao extends AbstractEntity {

  @Column({ type: 'varchar' })
  nomeAtleta: string;
}
```

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

Só as origens de `CORS_ORIGINS` podem chamar a API pelo navegador (padrão: um frontend em
`http://localhost:3000`). O cabeçalho `x-request-id` é exposto para o frontend conseguir lê-lo.
Para liberar mais de uma origem, separe por vírgula:
`CORS_ORIGINS=http://localhost:3000,https://app.exemplo.com`.

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
| Qualquer outro erro | 500 | `Erro interno no servidor` (o erro real vai só para o log, com stack trace) |

- Para erros de negócio, lance as exceções HTTP do Nest com uma mensagem clara; ela chega ao cliente
  em `detail`.
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
roda como usuário `node` (não root), em `NODE_ENV=production`, na porta `8080` (a padrão do Fly; no
desenvolvimento local a porta continua `3333`). O `.dockerignore`
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
fly secrets set POSTGRES_HOST=... POSTGRES_PORT=5432 POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=... CORS_ORIGINS=https://...
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
- **Imports com apelido `@/`** apontando para `src/`: use `@/` sempre que o import precisaria de
  `../`; para a mesma pasta ou subpastas, use `./`. Nos testes, sempre `@/`.

  ```ts
  import { EnvUtils } from '@/utils/env.utils.js';
  ```

  O apelido é definido em `paths` no `tsconfig.json`. O `nest build` reescreve para caminhos relativos
  no `dist/`, e o Vitest o resolve pelo `vite-tsconfig-paths`.
- Estilo **orientado a objetos**: classes no lugar de funções soltas, e utilitários como métodos
  estáticos (ex.: `EnvUtils.getRequired`).

## Commits e CI

Padrão de commits, validado pelo `commitlint` (`commitlint.config.js`) no hook `commit-msg`:

- Conventional Commits **sem escopo**: `feat: ...`, nunca `feat(user): ...`.
- Cabeçalho de até 80 caracteres e nenhuma assinatura do Claude.
- Commits pequenos: um método ou, no máximo, uma classe por commit.

O hook `pre-commit` (husky + lint-staged) roda `eslint --fix` e `oxlint` nos arquivos alterados.

O CI (`.github/workflows/ci.yml`) roda em pushes para a `master` e em PRs: valida as mensagens de
commit do PR; roda formatação, lint, checagem de tipos, build e testes (com Postgres); e faz o build
da imagem Docker.

## Estrutura

```
src/
├── config/
│   ├── load-env.ts                    # carrega o .env antes de tudo
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
├── logger/logger.config.ts            # pino: formato, request id e dados ocultos
├── utils/env.utils.ts                 # leitura de variáveis de ambiente
├── app.module.ts
└── main.ts
test/
├── unit/                              # espelha src/
├── e2e/
└── setup/                             # ambiente e banco de teste dos e2e
```

## Scripts

| Script | O que faz |
|---|---|
| `start:dev` | Sobe a API com reload automático |
| `start:prod` | Sobe a partir do `dist/` |
| `build` | Compila para `dist/` |
| `db:up` / `db:down` / `db:logs` | Controla o Postgres no Docker |
| `migration:create` / `generate` / `run` / `revert` | Migrations do TypeORM |
| `migration:run:prod` | Roda as migrations sem build, sobre o `dist/` (usado no deploy) |
| `test` / `test:e2e` / `test:cov` | Testes com Vitest |
| `format` / `format:check` | Formatação com ESLint Stylistic |
| `lint` | Lint com oxlint |
| `typecheck` | Checagem de tipos de `src/` e `test/` |
