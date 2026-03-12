# Training Credentials Handling

This repository no longer stores plaintext training credentials in tracked documentation.

## Current Workflow

Generate training accounts and the local credentials file with:

- `scripts/training/Setup-TrainingEnvironment.ps1`

That script now writes the sensitive account list to the local ignored path:

- `artifacts/training/TRAINING_CREDENTIALS.local.md`

## Security Rules

- Do not commit generated credentials to git.
- Share credentials only through approved local/offline trainer workflows.
- Rotate or delete training accounts after the session.
- Treat generated credential artifacts as sensitive local operational data.

## Historical Note

If you are reading older Phase 5 deployment/training documents that mention `docs/training/TRAINING_CREDENTIALS.md`, interpret that as the new local generated artifact path under `artifacts/training/`.
