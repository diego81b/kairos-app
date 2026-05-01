# KAIROS — Claude Instructions

## Commit after every change

After completing any set of file modifications, always create a git commit using **Conventional Commits** style.

### Format

```
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
```
fix(backend): correct after_output type in UpsertMyAgentConfigDto
```

Medium change (title + 2–3 points):
```
feat(settings-ui): add Agents tab with create and config slideovers

- AgentsTab with UTable listing global and private agents
- AgentCreateSlideover form with Zod validation
- AgentConfigSlideover with provider, prompt override and binding sections
```

Large change (title + 4 points max):
```
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
| New feature, refactor, chore, docs | `feature/` | `develop` | `feature/minio-object-storage` |
| Bug fix discovered during development | `bugfix/` | `develop` | `bugfix/role-case-sensitivity` |
| Urgent fix on production code | `hotfix/` | `main` | `hotfix/jwt-expiry-crash` |
| Release preparation | `release/` | `develop` | `release/1.2.0` |

### Branch rules

- **Never commit directly to `main` or `develop`**
- Features, refactors, docs, chores, and style changes all use `feature/`
- Use `bugfix/` only for bugs found in `develop` before a release
- Use `hotfix/` only for critical fixes that must go directly to `main`
- Keep slugs short and lowercase, words separated by `-`

## Update documentation after every change

After completing any set of file modifications, always update the README and any relevant documentation in the `docs/` folder to reflect the changes made.

- **Use existing files**: always update files that already exist in `docs/` rather than creating new ones.
- **Ask for confirmation**: only ask before creating a brand-new documentation file — if the right file already exists, update it directly without asking.
