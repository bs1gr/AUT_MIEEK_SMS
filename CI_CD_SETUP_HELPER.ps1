# CI/CD Setup Automation Script
# Usage: .\CI_CD_SETUP_HELPER.ps1 -Action generate_ssh
# Or:    .\CI_CD_SETUP_HELPER.ps1 -Action verify_setup

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('generate_ssh', 'verify_setup', 'test_connections', 'validate_workflow')]
    [string]$Action,

    [string]$StagingHost = "staging.example.com",
    [string]$ProductionHost = "prod.example.com",
    [string]$DeployUser = "deploy",
    [string]$KeyPath = "./deploy_key"
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# ============================================================================
# ACTION: Generate SSH Key
# ============================================================================

function Generate-SSHKey {
    Write-Info "Generating SSH key pair for deployment..."

    # Check if key already exists
    if (Test-Path $KeyPath) {
        Write-Error-Custom "Key file already exists: $KeyPath"
        Write-Info "To regenerate, delete the existing key first:"
        Write-Host "  Remove-Item $KeyPath"
        Write-Host "  Remove-Item $KeyPath.pub"
        return $false
    }

    # Check if ssh-keygen is available
    if (-not (Get-Command ssh-keygen -ErrorAction SilentlyContinue)) {
        Write-Error-Custom "ssh-keygen not found. Install OpenSSH:"
        Write-Host "  Windows 10+: Settings → Apps → Optional Features → OpenSSH Client"
        Write-Host "  Or use WSL/Git Bash"
        return $false
    }

    Write-Info "Generating ED25519 key (modern, secure)..."

    # Generate key with no passphrase
    & ssh-keygen -t ed25519 -f $KeyPath -N ""

    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSH key pair generated successfully"
        Write-Info "Private key: $KeyPath"
        Write-Info "Public key:  $KeyPath.pub"
        Write-Info ""
        Write-Info "📋 Next steps:"
        Write-Info "1. Add private key to GitHub secrets:"
        Write-Host "   - Go to: Settings → Secrets and variables → Actions"
        Write-Host "   - Click: New repository secret"
        Write-Host "   - Name: DEPLOY_KEY"
        Write-Host "   - Value: [Copy contents of $KeyPath]"
        Write-Info ""
        Write-Info "2. Copy public key to servers:"
        Write-Host "   - Content of $KeyPath.pub:"
        Write-Host "   " ((Get-Content "$KeyPath.pub") | Out-String).Trim()
        Write-Host ""
        Write-Info "3. On each server, add to ~/.ssh/authorized_keys"

        return $true
    } else {
        Write-Error-Custom "Failed to generate SSH key"
        return $false
    }
}

# ============================================================================
# ACTION: Verify Setup
# ============================================================================

function Verify-Setup {
    Write-Info "Verifying CI/CD setup..."
    Write-Info ""

    $issues = @()

    # Check 1: GitHub Secrets
    Write-Info "Checking GitHub secrets..."
    Write-Warning-Custom "GitHub secrets must be verified manually:"
    Write-Host "  1. Go to: Settings → Secrets and variables → Actions"
    Write-Host "  2. Verify these secrets exist:"
    Write-Host "     - SLACK_WEBHOOK_URL"
    Write-Host "     - DEPLOY_KEY"
    Write-Host "     - TEAMS_WEBHOOK_URL (optional)"
    Write-Host ""

    # Check 2: SSH Key File
    Write-Info "Checking SSH key file..."
    if (Test-Path $KeyPath) {
        Write-Success "Private key found: $KeyPath"

        # Check permissions (Windows)
        $acl = Get-Acl $KeyPath
        if ($acl.Access.Count -le 2) {  # Owner + System typically
            Write-Success "Key file permissions look good"
        } else {
            Write-Warning-Custom "Key file has multiple access rules (less secure)"
            $issues += "Restrict SSH key file permissions"
        }
    } else {
        Write-Error-Custom "Private key not found: $KeyPath"
        $issues += "Generate SSH key using: .\CI_CD_SETUP_HELPER.ps1 -Action generate_ssh"
    }

    if (Test-Path "$KeyPath.pub") {
        Write-Success "Public key found: $KeyPath.pub"
    } else {
        Write-Error-Custom "Public key not found: $KeyPath.pub"
    }

    Write-Host ""

    # Check 3: Workflow Files
    Write-Info "Checking workflow files..."

    $pipelineFile = ".\.github\workflows\ci-cd-pipeline.yml"
    if (Test-Path $pipelineFile) {
        Write-Success "Pipeline workflow found"

        # Check for placeholder hosts
        $content = Get-Content $pipelineFile -Raw
        if ($content -match "staging\.example\.com") {
            Write-Error-Custom "Workflow still has placeholder staging host"
            $issues += "Update staging host in workflow"
        }
        if ($content -match "prod\.example\.com") {
            Write-Error-Custom "Workflow still has placeholder production host"
            $issues += "Update production host in workflow"
        }
    } else {
        Write-Error-Custom "Pipeline workflow not found"
        $issues += "Workflow file missing: $pipelineFile"
    }

    Write-Host ""

    # Summary
    if ($issues.Count -eq 0) {
        Write-Success "All setup checks passed! Ready for testing."
    } else {
        Write-Warning-Custom "Setup has $($issues.Count) issues to resolve:"
        $issues | ForEach-Object { Write-Host "  - $_" }
    }

    return $issues.Count -eq 0
}

# ============================================================================
# ACTION: Test Connections
# ============================================================================

function Test-Connections {
    Write-Info "Testing SSH connections..."
    Write-Info ""

    if (-not (Test-Path $KeyPath)) {
        Write-Error-Custom "SSH key not found: $KeyPath"
        Write-Info "Generate key first: .\CI_CD_SETUP_HELPER.ps1 -Action generate_ssh"
        return $false
    }

    $allPassed = $true

    # Test Staging
    Write-Info "Testing connection to staging: $StagingHost"

    try {
        $result = ssh -i $KeyPath "${DeployUser}@${StagingHost}" "whoami && pwd" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Staging connection successful"
            Write-Info "Response: $result"
        } else {
            Write-Error-Custom "Staging connection failed"
            Write-Info "Error: $result"
            $allPassed = $false
        }
    } catch {
        Write-Error-Custom "Staging connection failed: $_"
        $allPassed = $false
    }

    Write-Host ""

    # Test Production
    Write-Info "Testing connection to production: $ProductionHost"

    try {
        $result = ssh -i $KeyPath "${DeployUser}@${ProductionHost}" "whoami && pwd" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Production connection successful"
            Write-Info "Response: $result"
        } else {
            Write-Error-Custom "Production connection failed"
            Write-Info "Error: $result"
            $allPassed = $false
        }
    } catch {
        Write-Error-Custom "Production connection failed: $_"
        $allPassed = $false
    }

    Write-Host ""

    # Test Docker on both
    Write-Info "Testing Docker access..."

    try {
        $result = ssh -i $KeyPath "${DeployUser}@${StagingHost}" "docker --version" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker available on staging"
            Write-Info "Version: $result"
        } else {
            Write-Warning-Custom "Docker not available on staging (may be OK if using other deployment method)"
        }
    } catch {
        Write-Warning-Custom "Docker check failed on staging"
    }

    return $allPassed
}

# ============================================================================
# ACTION: Validate Workflow
# ============================================================================

function Validate-Workflow {
    Write-Info "Validating workflow YAML..."

    $workflowFile = ".\.github\workflows\ci-cd-pipeline.yml"

    if (-not (Test-Path $workflowFile)) {
        Write-Error-Custom "Workflow file not found: $workflowFile"
        return $false
    }

    # Simple YAML validation (checks for syntax errors)
    Write-Info "Checking YAML syntax..."

    try {
        $content = Get-Content $workflowFile -Raw

        # Check for basic YAML structure
        $hasJobs = $content -match "^jobs:"
        $hasSteps = $content -match "^\s+steps:"
        $hasRuns = $content -match "^\s+run:"

        if ($hasJobs -and $hasSteps -and $hasRuns) {
            Write-Success "Workflow YAML structure looks valid"
        } else {
            Write-Error-Custom "Workflow YAML may have issues"
        }

        # Check for required secrets
        Write-Info "Checking for required secrets..."
        $requiresSlack = $content -match "SLACK_WEBHOOK_URL"
        $requiresDeploy = $content -match "DEPLOY_KEY"

        if ($requiresSlack) {
            Write-Info "Workflow requires: SLACK_WEBHOOK_URL"
        }
        if ($requiresDeploy) {
            Write-Info "Workflow requires: DEPLOY_KEY"
        }

        Write-Host ""
        Write-Info "To validate YAML syntax online:"
        Write-Host "  https://www.yamllint.com/"
        Write-Host ""
        Write-Info "Or install yamllint:"
        Write-Host "  pip install yamllint"
        Write-Host "  yamllint .github/workflows/ci-cd-pipeline.yml"

        return $true
    } catch {
        Write-Error-Custom "Error validating workflow: $_"
        return $false
    }
}

# ============================================================================
# MAIN
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         CI/CD Setup Helper - Student Management System         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    'generate_ssh' {
        Write-Info "ACTION: Generate SSH Key"
        Generate-SSHKey
    }
    'verify_setup' {
        Write-Info "ACTION: Verify Setup"
        Verify-Setup
    }
    'test_connections' {
        Write-Info "ACTION: Test Connections"
        Write-Info "Staging Host: $StagingHost"
        Write-Info "Production Host: $ProductionHost"
        Write-Info "Deploy User: $DeployUser"
        Write-Host ""
        Test-Connections
    }
    'validate_workflow' {
        Write-Info "ACTION: Validate Workflow"
        Validate-Workflow
    }
}

Write-Host ""
Write-Host "✨ Operation complete" -ForegroundColor Green
Write-Host ""
