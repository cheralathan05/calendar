## Summary

<!-- What does this PR do? 1–3 bullet points on the key changes. -->

-
-

## Motivation

<!-- Why is this change needed? Link to an issue if applicable. Closes #... -->

## Changes

<!-- Enumerate the logical changes, matching the commit list. -->

| Commit | What changed |
|--------|-------------|
| | |

## Testing

<!-- How was this tested? Describe manual steps or point to automated tests. -->

- [ ] Unit / integration tests pass (`pnpm test`)
- [ ] Type-check passes (`pnpm -C apps/api typecheck && pnpm -C apps/web build`)
- [ ] Manually tested in development (`pnpm dev`)
- [ ] Tested on mobile viewport (if UI changes included)

## Screenshots / recordings

<!-- Delete this section if not applicable. -->

## Checklist

- [ ] Commits follow [Conventional Commits](../CONTRIBUTING.md#commit-messages)
- [ ] No `console.log` left in production paths
- [ ] No new TypeScript `any` without justification
- [ ] Env var changes are documented in the relevant `.env.example`
