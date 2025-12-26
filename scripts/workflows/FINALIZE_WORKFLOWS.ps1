# This script automates the cleanup of workflow testing artifacts and restores production settings.
# Run this from the repository root: .\scripts\workflows\FINALIZE_WORKFLOWS.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Finalizing workflow configurations..." -ForegroundColor Cyan

# 1. Define the production content for operator-approval.yml
# This restores 'pull_request_target' and removes debug steps, while keeping the smart path filtering.
$operatorWorkflowPath = ".github/workflows/operator-approval.yml"
$operatorWorkflowContent = @"
name: Require operator approval for operator scripts

on:
  pull_request_target:
    types: [opened, edited, synchronize, reopened, ready_for_review, labeled, unlabeled]

jobs:
  changes:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    outputs:
      operator: `${{ steps.filter.outputs.operator }}
    steps:
      - name: Detect operator script changes
        uses: actions/github-script@v6
        id: filter
        with:
          github-token: `${{ secrets.GITHUB_TOKEN }}
          script: |
            try {
              const pr = context.payload.pull_request;
              if (!pr) {
                core.info("Not a pull request event.");
                core.setOutput('operator', 'false');
                return;
              }
              const files = await github.paginate(github.rest.pulls.listFiles, {
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: pr.number
              });
              const changed = files.some(f => f.filename.startsWith('scripts/operator/'));
              core.info('Operator scripts changed: ' + changed);
              core.setOutput('operator', changed ? 'true' : 'false');
            } catch (error) {
              core.setFailed('Failed to check file changes: ' + error.message);
            }

  require-operator-approval:
    needs: changes
    if: `${{ needs.changes.outputs.operator == 'true' }}
    name: Require operator approval for operator scripts
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - name: Check PR for operator script changes and labels
        uses: actions/github-script@v6
        with:
          github-token: `${{ secrets.GITHUB_TOKEN }}
          script: |
            const pr = context.payload.pull_request;
            if (!pr) {
              core.info('No pull request context; skipping operator approval check.');
              return;
            }
            const prNumber = pr.number;
            const owner = context.repo.owner;
            const repo = context.repo.repo;

            const labels = (pr.labels || []).map(l => l.name);
            if (labels.includes('operator-approved')) {
              core.info('Operator-approved label present; allowing PR to proceed.');
              return;
            }

            // Post a helpful comment on the PR to explain how to obtain operator approval
            try {
              const body = "⚠️ This pull request modifies files under ``scripts/operator/`` which are operator-only and may contain host-destructive commands.\n\nPlease ask an operator to review these changes and add the **operator-approved** label to this PR when approved.\n\nSee the operator guide for details: docs/OPERATOR_EMERGENCY_GUIDE.md";
              await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
            } catch (err) {
              core.warning('Failed to post PR comment about operator approval: ' + err.message);
            }

            core.setFailed("This PR modifies operator scripts under scripts/operator/. Please add the 'operator-approved' label after an operator has reviewed and approved these changes.");
"@

Write-Host "Restoring $operatorWorkflowPath to production state..."
Set-Content -Path $operatorWorkflowPath -Value $operatorWorkflowContent -Encoding UTF8

# 2. Remove the temporary example file
$exampleFile = ".github/workflows/ci-smart-skip-example.yml"
if (Test-Path $exampleFile) {
    Write-Host "Removing temporary file $exampleFile..."
    Remove-Item -Path $exampleFile -Force
}

# 3. Git operations
Write-Host "Staging changes..."
git add .

Write-Host "Committing changes..."
git commit -m "chore: finalize workflows for production (revert triggers, remove debugs)"

Write-Host "Pushing to remote..."
git push

Write-Host "✅ Done! Workflows are ready for merge." -ForegroundColor Green
