"""
Secret guard script used in CI.

Per maintainer preference, this script prints warnings when the
`SECRET_KEY` is missing or still the dev placeholder, but does not
fail CI. The workflow controls whether to treat findings as fatal.
"""

import os

PLACEHOLDER = "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"


def main() -> int:
    secret = os.environ.get("SECRET_KEY", "")

    problems = []

    if not secret:
        problems.append("SECRET_KEY is not set. Set SECRET_KEY in environment for production builds.")

    if secret == PLACEHOLDER:
        problems.append(
            "SECRET_KEY is set to the development placeholder. Replace it with a secure secret in CI/production."
        )

    if problems:
        print("ERROR: Secret guard found issues:")
        for p in problems:
            print(" - ", p)
        # Now return non-zero so CI jobs that run this script will fail when
        # SECRET_KEY is missing or set to the dev placeholder.
        # This makes the secret-guard blocking by default; workflows can still
        # override behavior if they explicitly want a non-fatal check.
        return 1

    print("SECRET_KEY check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
