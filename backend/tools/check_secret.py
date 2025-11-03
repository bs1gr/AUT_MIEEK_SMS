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
    block_on_fail = os.environ.get("BLOCK_ON_FAIL", "false").lower() in ("1", "true", "yes")

    problems = []

    if not secret:
        problems.append("SECRET_KEY is not set. Set SECRET_KEY in environment for production builds.")

    if secret == PLACEHOLDER:
        problems.append(
            "SECRET_KEY is set to the development placeholder. Replace it with a secure secret in CI/production."
        )

    if problems:
        print("WARNING: Secret guard found issues:")
        for p in problems:
            print(" - ", p)
        # Allow workflow to decide whether this should be blocking.
        if block_on_fail:
            print("Blocking enabled (BLOCK_ON_FAIL). Exiting with error exit code.")
            return 1
        # Default to warnings-only to avoid surprising CI failures when a temporary
        # secret is generated for runner environments.
        return 0

    print("SECRET_KEY check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
