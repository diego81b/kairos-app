# KAIROS — Claude Instructions

## Commit after every change

After completing any set of file modifications, always create a git commit using **Conventional Commits** style.

### Format

```text
<type>(<scope>): <short title>

- point 1
- point 2
- point 3 (optional)
- point 4 (optional, only for large changesets)
```

Use **only the title line** (no bullet points) when the change is minimal (single file, trivial fix or rename).

### Types

| Type | When to use |
| --- | --- |
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behavior change |
| `docs` | Documentation only |
| `chore` | Config, tooling, deps, non-functional |
| `style` | Formatting, naming, no logic change |
| `test` | Adding or updating tests |

### Scope

Use the area of the codebase affected: `backend`, `frontend`, `docker`, `docs`, `types`, `auth`, `agents`, `settings-ui`, etc.
Omit scope only when the change truly spans the entire project.

### Examples

Minimal change (title only):

```text
fix(backend): correct after_output type in UpsertMyAgentConfigDto
```

Medium change (title + 2–3 points):

```text
feat(settings-ui): add Agents tab with create and config slideovers

- AgentsTab with UTable listing global and private agents
- AgentCreateSlideover form with Zod validation
- AgentConfigSlideover with provider, prompt override and binding sections
```

Large change (title + 4 points max):

```text
feat(frontend): scaffold Settings page with agent, provider and credential management

- /settings page with UTabs (Agenti, Provider, Credenziali)
- 4 new composables: useAgentApi, useProviderApi, useCredentialApi, useBindingApi
- TypeScript types in app/types/ for Agent, LlmProvider, Binding
- Navbar updated with Settings link in default.vue
```

### Rules

- Write commit messages in **English**
- Keep the title under **72 characters**
- Never use `--no-verify`
- Never amend a pushed commit
- One commit per logical unit of work; do not batch unrelated changes
- **Never add `Co-Authored-By` trailers** to commit messages

## Branch, commit and push after every change

This project uses **Gitflow**. After completing any set of file modifications:

1. **Create the right branch type** using the table below, then commit and push.

2. **Commit** on that branch following the Conventional Commits format above.

3. **Push** the branch to the remote:

   ```bash
   git push -u origin <branch-name>
   ```

4. **Do not merge** — leave the PR/merge to the user.

### Branch types

| Work type | Branch prefix | Base branch | Example |
| --- | --- | --- | --- |
| New feature, refactor, chore, docs, bug fix in develop | `feature/` | `develop` | `feature/minio-object-storage` |
| Urgent fix on production code | `hotfix/` | `main` | `hotfix/jwt-expiry-crash` |
| Release preparation | `release/` | `develop` | `release/1.2.0` |

### Branch rules

- **Never commit directly to `main` or `develop`**
- Features, refactors, docs, chores, style changes, and bug fixes found in `develop` all use `feature/`
- Use `hotfix/` only for critical fixes that must go directly to `main`
- Keep slugs short and lowercase, words separated by `-`

## Keep .env.example in sync

Whenever any `.env` file is modified (root `.env`, `backend/.env`, `frontend/.env`, or any other), **always update the corresponding `.env.example`** in the same directory:

- Add any new variable with a placeholder or safe default value (never a real secret)
- Remove any variable that was deleted
- Keep comments and grouping consistent with the `.env` file

Do this in the same commit as the `.env` change.

## Update documentation after every change

After completing any set of file modifications, always update the README and any relevant documentation in the `docs/` folder to reflect the changes made.

- **Use existing files**: always update files that already exist in `docs/` rather than creating new ones.
- **Ask for confirmation**: only ask before creating a brand-new documentation file — if the right file already exists, update it directly without asking.

### What must be documented

Every change that affects any of the following **must** be reflected in `docs/`:

| Change type | Where to document |
| --- | --- |
| New or modified entity / table | `DATABASE-SCHEMA.md` |
| New seeder or seed data (users, agents, plugins) | `ARCHITECTURE.md` — *Database Seeding* section |
| New API endpoint or controller | `ARCHITECTURE.md` and/or `KAIROS-WEBAPP-ORCHESTRATION.md` |
| Auth flow change | `AUTHENTICATION-STRATEGY.md` |
| New module, service, or major dependency | `ARCHITECTURE.md` |
| New environment variable | `.env.example` **and** `ARCHITECTURE.md` |
| Agent or plugin system change | `PLUGIN-SYSTEM-DESIGN.md` |
| New `npm run` script or CLI command | `ARCHITECTURE.md` — *Development Setup* section |

When in doubt, update `ARCHITECTURE.md` — it is the single source of truth for the technical implementation.
