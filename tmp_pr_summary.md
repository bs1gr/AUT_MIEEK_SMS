# PR #45 — load-testing summary (smoke run)

Summary:
- Local smoke+load run completed successfully (exit code 0).
- No auth 400/429 or student 422 validation failures in the latest run.
- HTML report attached as a draft release: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/untagged-fcfd0282c46b81701354

Next steps:
- CI workflow `load-testing.yml` has been triggered on branch `fix/auth-duplication-clean` to produce official artifacts.
- Artifacts will be available on the Actions run page; I will add a follow-up comment when the workflow completes and artifacts are attached.

Regards,
Automated test runner
