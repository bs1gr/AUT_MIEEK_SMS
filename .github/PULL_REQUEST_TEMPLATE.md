# Pull Request Title

<!-- Use conventional commits: feat, fix, chore, docs, refactor, test, ci -->

## Summary

Describe the change in 2-3 sentences. What problem does it solve? Why now?

## Changes

- [ ] Feature implementation
- [ ] Bug fix
- [ ] Documentation updates
- [ ] Tooling / CI enhancements
- [ ] Refactor / cleanup
- [ ] Tests added/updated

## Lint & Quality

| Check | Status |
|-------|--------|
| Markdown Lint Issues | <!-- Add count from PR comment or workflow --> |
| Backend Tests | <!-- e.g. 246 passing --> |
| Frontend Tests | <!-- e.g. 929 passing --> |

## Screenshots / Logs (Optional)

Include before/after UI screenshots or relevant log excerpts.

## Breaking Changes

Does this introduce a breaking change? Detail migration steps if yes.

## Deployment Notes

Any special steps for deployment (DB migration, volume update, environment variable changes)?

## Checklist

- [ ] Code follows project style & constraints
- [ ] i18n keys added for new UI strings (EN + EL)
- [ ] Rate limiting applied to new write endpoints (`@limiter.limit(RATE_LIMIT_WRITE)`)
- [ ] Alembic migration created/applied for schema changes (no direct DB edits)
- [ ] Updated or added tests cover new logic & edge cases
- [ ] Documentation updated (README / guides / index)
- [ ] Secrets / tokens not committed
- [ ] Lint report reviewed; high-severity issues addressed

## Related Issues / Tickets

Link related issues: Fixes #123, Closes #456

## Additional Notes

Anything reviewers should pay attention to (performance concerns, follow-up phases, deferred tasks).

<!-- If this PR touches `scripts/operator/` files, ensure an operator reviews and adds the `operator-approved` label -->
