# KAIROS Webapp

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

A Kanban-based orchestration system that routes issues through AI agents (PM, Architect, Code Reviewer, Tester, Release Planner) with multi-provider LLM support and full cost tracking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Nuxt 4, Nuxt UI, TailwindCSS, Pinia |
| Backend | NestJS 10, Fastify adapter |
| ORM | MikroORM 6 (Unit of Work, code-first) |
| Database | PostgreSQL 16 |
| Auth | Built-in JWT (access 15 min + refresh 7 days) |
| LLM | Direct API — Anthropic, OpenRouter, OpenAI, Ollama |
| Dev tooling | Docker Compose, TypeScript strict |

---

## Project Structure

```
kairos-app/
├── backend/                    NestJS API (port 23001 in dev)
│   ├── src/
│   │   ├── domain/entities/    14 MikroORM entities
│   │   ├── infrastructure/
│   │   │   ├── config/         EnvConfig.ts
│   │   │   ├── http/guards/    JwtAuthGuard
│   │   │   ├── persistence/    MikroOrmConfig + migrations + seeders/
│   │   │   ├── plugin/         PluginRegistry, ProviderResolutionService
│   │   │   └── security/       PasswordHasher, Encryption
│   │   ├── presentation/
│   │   │   ├── http/           Requests, Responses
│   │   │   └── modules/
│   │   │       ├── auth/       Register / Login / Refresh / Logout / Me
│   │   │       ├── my-agents/  Agent CRUD + per-user config
│   │   │       └── plugins-admin/ Providers / Plugins / Bindings / Credentials
│   │   └── shared/             types.ts, errors.ts
│   ├── Dockerfile              Multi-stage: dev | build | prod
│   └── .env.example
│
├── frontend/                   Nuxt 4 SPA (port 23000 in dev)
│   ├── app/
│   │   ├── assets/css/         main.css (Tailwind + Nuxt UI)
│   │   ├── components/
│   │   │   ├── kanban/         KanbanBoard → KanbanColumn → KanbanCard
│   │   │   └── settings/       AgentsTab, AgentCreateSlideover,
│   │   │                       AgentConfigSlideover, ProvidersTab,
│   │   │                       CredentialsTab
│   │   ├── composables/        useApi.ts, useAgentApi.ts, useProviderApi.ts,
│   │   │                       useCredentialApi.ts, useBindingApi.ts
│   │   ├── layouts/            default.vue (navbar + Settings link)
│   │   ├── middleware/         auth.ts (redirect unauthenticated users)
│   │   ├── pages/              index, login, register, home, board, settings
│   │   ├── plugins/            auth.client.ts (restore session from localStorage)
│   │   ├── stores/             auth.ts (Pinia)
│   │   └── types/              agent.ts, provider.ts, binding.ts, index.ts
│   ├── Dockerfile              Multi-stage: dev | build | prod
│   └── .env.example
│
├── docker-compose.yml          Base — all 3 services
├── docker-compose.dev.yml      Dev — hot reload, bind mounts, migration+seed on startup
├── docker-compose.prod.yml     Prod — compiled images, restart policies
├── .env.example                Root template for docker-compose variables
└── run.bat                     Shorthand commands (dev-up, dev-down, prod-up, …)
```

---

## Database Schema (14 tables)

```
users                      Auth + workspace
refresh_tokens             JWT rotation (multi-device)
issues                     Kanban cards (source, column, enabled agents)
agents                     Definizioni agenti (global built-in + private per utente)
agent_outputs              Risultati LLM per agente/versione (approval workflow)
agent_configurations       Provider/model/temperature per tipo agente (globale)
user_agent_configurations  Override provider/model/temperature per utente per agente
llm_providers              Provider LLM disponibili (Anthropic, OpenAI, OpenRouter, Ollama)
llm_provider_credentials   API key cifrate per utente (AES-256-GCM)
cost_logs                  Token usage + costo USD per esecuzione
agent_plugin_bindings      Binding agente ↔ plugin LLM con config
plugins                    Registry plugin (provider, agent, tool)
plugin_audit_logs          Audit trail operazioni sensibili sui plugin
provider_credentials       (legacy — presente backfill migration)
```

---

## Quick Start (Development)

### Prerequisites

- Docker Desktop with BuildKit enabled (default on Docker Desktop 4+)

### 1. Clone and configure

```bash
cd kairos-app
cp .env.example .env
```

Edit `.env` — at minimum change these three values:

```env
DB_PASSWORD=your-password
JWT_SECRET=<output of: openssl rand -hex 32>
ENCRYPTION_KEY=<output of: openssl rand -hex 32>
```

### 2. Start everything

```bash
run.bat dev-up-bd     # build images + start detached
```

On first run Docker will download base images and install npm packages — this takes a few minutes.
Subsequent runs are fast thanks to BuildKit npm cache.

Available commands:

```
run.bat dev-up        # start (attached logs)
run.bat dev-up-d      # start detached
run.bat dev-up-b      # rebuild + start
run.bat dev-up-bd     # rebuild + start detached
run.bat dev-fresh     # drop backend node_modules volume, rebuild image, start detached
                      #   use after adding/removing npm packages
run.bat dev-down      # stop and remove containers
run.bat dev-logs      # follow logs
run.bat ps            # container status
run.bat clean         # stop + remove volumes (destroys DB data)
```

### 3. Services

| Service      | URL                                    |
|--------------|----------------------------------------|
| Frontend     | <http://localhost:23000>               |
| Backend API  | <http://localhost:23001/api>           |
| Health check | <http://localhost:23001/health>        |
| PostgreSQL   | localhost:25432                        |

### 4. Database — migrations and seed

Migrations and the demo user seeder **run automatically at every backend startup**.
No manual steps needed on first run.

To reset the database and re-seed from scratch:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npm run migration:fresh
```

To seed without resetting:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npm run seed:run
```

---

## Login

After starting the stack, open <http://localhost:23000>.
You will be redirected to the login page automatically.

### Demo accounts (created by seeder)

| Email              | Password    | Role    |
|--------------------|-------------|---------|
| `admin@kairos.app` | `admin1234` | `ADMIN` |
| `user@kairos.app`  | `user1234`  | `USER`  |

> **Never use these credentials in production.** The seeder is idempotent and skips existing users.

The admin account can access the **Provider** tab in `/settings`; the regular user cannot.

### Auth flow

1. **Login** → POST `/api/auth/login` → returns `accessToken` (15 min) + `refreshToken` (7 days)
2. **Session** is persisted in memory (Pinia store) and `refreshToken` in `localStorage`
3. On page reload the plugin `auth.client.ts` reads `localStorage`, calls `/api/auth/refresh`, and restores the session silently
4. All API calls go through `useApi.ts` which injects the `Authorization: Bearer` header and automatically retries with a fresh token on 401
5. **Logout** revokes the refresh token server-side and clears the local session

### Pages

| Path        | Access        | Description                                          |
|-------------|---------------|------------------------------------------------------|
| `/login`    | Public        | Sign in form                                         |
| `/register` | Public        | Create new account                                   |
| `/home`     | Authenticated | Welcome page with user info                          |
| `/board`    | Authenticated | Kanban board                                         |
| `/settings` | Authenticated | Gestione agenti, provider e credenziali (3 tab)      |

Unauthenticated users are redirected to `/login`.
Authenticated users accessing `/login` or `/register` are redirected to `/home`.

---

## Settings UI

La pagina `/settings` è il pannello di configurazione degli agenti AI e dei provider LLM.
Accessibile dalla navbar dopo il login, è organizzata in tre tab.

### Tab — Agenti

Mostra tutti gli agenti visibili all'utente: quelli globali (built-in, sola lettura) e quelli privati creati dall'utente stesso.

| Colonna | Descrizione |
| --- | --- |
| Nome | Nome dell'agente |
| Tipo | `pm` / `architect` / `reviewer` / `tester` / `planner` |
| Visibilità | `Globale` (built-in) oppure `Privato` (creato dall'utente) |
| Stato | Attivo / Inattivo |
| Azioni | Pulsante **Configura** |

**Nuovo agente** (pulsante in alto a destra): apre un pannello laterale con il form di creazione di un agente privato. Campi: nome, tipo, descrizione, system prompt, output format, output example, after output.

**Configura** (per ogni riga): apre il pannello laterale di configurazione con tre sezioni:

1. **Provider & Modello** — scelta del provider LLM, modello, temperature override, max tokens, toggle abilitato/disabilitato
2. **Override prompt** — campi facoltativi `output_format`, `output_example`, `after_output` che sovrascrivono i default dell'agente per questo utente
3. **Plugin binding** — lista dei binding agente ↔ plugin con possibilità di eliminazione

> I campi `output_format` e `output_example` definiscono il formato e un esempio dell'output atteso nel prompt.
> Il campo `after_output` è usato solo dall'orchestratore (non incluso nel prompt LLM).

### Tab — Provider *(solo admin)*

Gestione dei provider LLM disponibili nel sistema. Visibile solo agli utenti con ruolo `admin`.

| Azione | Descrizione |
|--------|-------------|
| Toggle abilitato | Abilita/disabilita un provider senza eliminarlo |
| Test connessione | Verifica la raggiungibilità del provider |
| Aggiungi provider | Form inline: chiave univoca, nome visualizzato, base URL opzionale |
| Elimina | Rimuove il provider |

### Tab — Credenziali

Gestione delle API key personali per i provider LLM. Ogni utente gestisce le proprie chiavi in modo indipendente; le chiavi sono cifrate in database (AES-256-GCM).

| Azione | Descrizione |
|--------|-------------|
| Aggiungi / Aggiorna API Key | Modal con select provider + input chiave |
| Elimina | Rimuove la credenziale |

---

## Auth API

All endpoints are prefixed with `/api`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create account, returns tokens + user |
| POST | `/auth/login` | — | Login, returns tokens + user |
| POST | `/auth/refresh` | — | Exchange refresh token for new token pair |
| POST | `/auth/logout` | — | Revoke refresh token |
| GET | `/auth/me` | Bearer | Current user profile |

### Example: Login

```bash
curl -X POST http://localhost:23001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@kairos.app","password":"user1234"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "abc...",
    "user": { "id": "...", "email": "user@kairos.app", "name": "Test User", "role": "USER", "workspace": "default" }
  }
}
```

---

## Hot Reload

Both services support hot reload in dev:

| Service  | Mechanism                                        |
|----------|--------------------------------------------------|
| Frontend | Vite HMR (polling enabled for Docker on Windows) |
| Backend  | `nest start --watch` + chokidar polling          |

Edit files under `frontend/app/` or `backend/src/` and changes apply automatically.

---

## Production Deployment

```bash
run.bat prod-up
```

All secret values must be set as environment variables on the host (or via CI/CD secrets).

### Required environment variables for production

```text
DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET               (long random string, never reuse dev value)
ENCRYPTION_KEY           (64-char hex: openssl rand -hex 32)
NUXT_PUBLIC_API_URL      (public URL of the backend, e.g. https://api.yourdomain.com/api)
FRONTEND_URL             (public URL of the frontend, for CORS)
```

---

## Environment Variables Reference

| Variable                   | Default                        | Description                            |
|----------------------------|--------------------------------|----------------------------------------|
| `NODE_ENV`                 | `development`                  | Environment mode                       |
| `DB_HOST`                  | `postgres`                     | PostgreSQL host                        |
| `DB_PORT`                  | `5432`                         | PostgreSQL port                        |
| `DB_USER`                  | —                              | Database user (required)               |
| `DB_PASSWORD`              | —                              | Database password (required)           |
| `DB_NAME`                  | —                              | Database name (required)               |
| `JWT_SECRET`               | —                              | JWT signing secret (required)          |
| `JWT_ACCESS_EXPIRES_IN`    | `15m`                          | Access token TTL                       |
| `JWT_REFRESH_EXPIRES_DAYS` | `7`                            | Refresh token TTL in days              |
| `API_PORT`                 | `23001`                        | Backend listen port                    |
| `FRONTEND_URL`             | `http://localhost:23000`       | Allowed CORS origin                    |
| `ENCRYPTION_KEY`           | —                              | 64-char hex for AES-256-GCM (required) |
| `NUXT_PUBLIC_API_URL`      | `http://localhost:23001/api`   | API base URL (frontend)                |

---

## Security Notes

- `.env` files are gitignored — only `.env.example` is committed
- Provider API keys are stored encrypted in the database (AES-256-GCM)
- Refresh tokens are hashed (SHA-256) before storage
- JWT access tokens expire in 15 minutes; refresh tokens rotate on use
- `ENCRYPTION_KEY` and `JWT_SECRET` must be different values in production

---

## Implementation Roadmap

- [x] **Week 1** — Foundation: NestJS + Fastify + MikroORM, all entities, migrations, JWT auth, Nuxt 4 SPA, login/home pages, demo user seeder
- [x] **Week 2** — Agent CRUD (global + private, output_format/example/after_output), per-user config, plugin system (registry, bindings, provider resolution, audit log), Settings UI (Agenti / Provider / Credenziali)
- [ ] **Week 2 (remaining)** — Issue endpoints, Kanban column move, mapping layers completi
- [ ] **Week 3** — Agent execution: Direct API calls (Anthropic/OpenRouter/OpenAI/Ollama), cost tracking, approval/feedback loop
- [ ] **Week 4** — Integrations: GitHub/Jira/GitLab ingest, PR upload, source sync, webhooks

---

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

Any modification or use of this software as part of a network service must make the complete source code available to users of that service.
