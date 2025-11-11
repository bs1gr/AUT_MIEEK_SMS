Branch protection: required settings for safe operator script changes
===============================================================

This short admin-facing document describes the exact branch protection configuration recommended for the
`main` (or other protected) branch to enforce CI checks, require operator approval for changes to
`scripts/operator/`, and limit who can push to protected branches.

Summary of recommendations
- Require status checks to pass before merging: the main CI workflow(s), the `Import checker` workflow,
  and the `Require operator approval for operator scripts` workflow.
- Require pull request reviews before merging (1 approval minimum).
- Dismiss stale pull request approvals when new commits are pushed.
- Require review from CODEOWNERS.
- Restrict who can push to the protected branch (e.g., repository admins or a small release team).

Exact GitHub UI steps
1. Go to the repository -> Settings -> Branches -> Branch protection rules -> Add rule (or edit existing rule for `main`).
2. Branch name pattern: `main` (or your protected branch name).
3. Check `Require status checks to pass before merging` and add these required checks (use the workflow names exactly):
   - `Import checker`
   - `Require operator approval for operator scripts`
   - plus your main CI workflow (example: `CI` or whatever your primary workflow is called)
4. Check `Require pull request reviews before merging` and set `Required approving reviews` to `1`.
5. Enable `Dismiss stale pull request approvals when new commits are pushed`.
6. Enable `Require review from Code Owners`.
7. (Optional) In `Restrict who can push to matching branches`, select the users/teams who are allowed to push
   (choose a small, trusted set such as repository administrators or a release team).
8. Save the rule.

Sample GitHub API / gh CLI invocation
Replace placeholders in angle brackets with your values.

Sample JSON body for the API (PUT request to /repos/:owner/:repo/branches/:branch/protection):

{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Import checker",
      "Require operator approval for operator scripts",
      "CI"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": {
    "users": ["<ADMIN_USERNAME>"],
    "teams": ["<RELEASE_TEAM_SLUG>"]
  }
}

gh CLI example (replace placeholders):

```powershell
gh api -X PUT /repos/<OWNER>/<REPO>/branches/<BRANCH>/protection \
  -f required_status_checks='{"strict":true,"contexts":["Import checker","Require operator approval for operator scripts","CI"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
  -f restrictions='{"users":["<ADMIN_USERNAME>"],"teams":["<RELEASE_TEAM_SLUG>"]}'
```

Verify the rule
- UI: Settings -> Branches -> click the rule and confirm the required checks and settings are present.
- gh: `gh api repos/<OWNER>/<REPO>/branches/<BRANCH>/protection | jq` to inspect the protection JSON.

Notes and tips
- The exact check names shown in branch protection must match the workflow display names that appear on PRs.
  Use the Actions tab and open a recent workflow run to copy the exact check context string if unsure.
- If you prefer not to hard-block admins, you can set `enforce_admins` to `false`, but this reduces protection.
- If you don't have a GitHub team for operators yet, create one in the organization and reference its team slug in the
  `restrictions.teams` field.

If you want, I can open a small PR that applies a recommended rule via the GitHub API (requires admin token) or
prepare a short playbook with screenshots for the UI steps.

Automated apply (admin)
-----------------------
If you prefer automation, there is a workflow included that will apply the branch protection rule when run by a
repository administrator. To use it:

1. Add a repository secret named `ADMIN_GH_PAT` containing a personal access token (classic) from an admin account
  with the `repo` scope (and admin repo permissions).
2. Open the Actions tab -> "Apply branch protection (admin)" workflow and click "Run workflow". Provide branch and
  checks if you want to override defaults.
3. The workflow will call the GitHub REST API and apply the protection. Check the Actions run log for success.

Note: This workflow exists because some environments (private repos on certain plans) block API protection changes
from non-admin tokens. Running the workflow requires an admin PAT stored in `ADMIN_GH_PAT` and should be used only
by repository administrators.
