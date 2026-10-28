# Contributing

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/recurring-events` |
| Bug fix | `fix/<short-description>` | `fix/cookie-cross-domain` |
| Chore / tooling | `chore/<short-description>` | `chore/upgrade-prisma` |
| Refactor | `refactor/<short-description>` | `refactor/event-form-hooks` |

Branches are created from `main` and merged back via pull request.

## Commit messages

This project follows **[Conventional Commits](https://www.conventionalcommits.org/)**.

```
type(scope): short imperative summary

Optional longer body explaining WHY, not what. Wrap at 72 chars.

Optional footer: Closes #123, BREAKING CHANGE: ...
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new capability visible to users or consumers |
| `fix` | A bug fix |
| `refactor` | Code change that neither adds a feature nor fixes a bug |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Tooling, CI, dependency bumps, config changes |
| `docs` | Documentation only |
| `style` | Formatting changes (no logic change) |

### Scopes (examples)

`auth`, `events`, `calendar`, `ics`, `mailer`, `api`, `responsive`, `event-form`, `location`

### Rules

- Subject line: imperative mood, no period, ≤72 chars (`add X`, not `added X` or `adds X`)
- One logical change per commit — use `git add -p` to stage hunks separately
- No `WIP`, `fix typo`, or `misc changes` in commits that land on `main`
- Squash or fixup before requesting review if you have noisy intermediate commits

### Examples

```
feat(events): add non-blocking CRUD mutation indicator

Previously every create/update/delete called refresh() which set
loading=true, replacing the calendar grid with a skeleton. This
was jarring and made the app feel slow.

Instead, introduce a separate `mutating` state that shows a thin
progress bar without disturbing the existing grid content.
```

```
fix(ics): move file input outside conditional to fix import trigger

React 17+ attaches event listeners to the root container. When the
<input type="file"> lived inside {open && <Dropdown>}, closing the
dropdown unmounted the element before the user could select a file,
so onChange never fired.
```

## Pull requests

- One PR per logical change (a PR may have multiple commits)
- Fill in the PR template fully — reviewers should understand *why* without reading the diff
- PRs must pass CI before merge
- Prefer **squash merge** for small single-purpose PRs, **merge commit** for multi-commit PRs that tell a story

## Code style

- TypeScript strict mode is on; no `@ts-ignore` without a comment explaining why
- No `console.log` in production code paths (use the NestJS `Logger` on the API side)
- Tailwind classes: mobile-first, use `sm:` / `md:` for breakpoints
- No new `any` without justification in a comment
