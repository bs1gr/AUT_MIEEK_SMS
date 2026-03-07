param(
    [string]$RecoveredKeyPath = ".\recovered_master.key",
    [string]$EncryptedBackupPath = ".\backup_20260307_095150.enc"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Apply recovered key + restore encrypted backup ===" -ForegroundColor Cyan

if (-not (Test-Path $RecoveredKeyPath)) {
    throw "Recovered key file not found: $RecoveredKeyPath"
}
if (-not (Test-Path $EncryptedBackupPath)) {
    throw "Encrypted backup not found: $EncryptedBackupPath"
}

$keyDir = ".\.keys"
$currentKey = Join-Path $keyDir "master.key"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupKey = Join-Path $keyDir "master.key.before_restore_$timestamp.bak"

if (-not (Test-Path $keyDir)) {
    New-Item -ItemType Directory -Path $keyDir -Force | Out-Null
}

if (Test-Path $currentKey) {
    Copy-Item $currentKey $backupKey -Force
    Write-Host "Backed up current key: $backupKey" -ForegroundColor Yellow
}

Copy-Item $RecoveredKeyPath $currentKey -Force
Write-Host "Applied recovered key to: $currentKey" -ForegroundColor Green

$keySize = (Get-Item $currentKey).Length
if ($keySize -ne 32) {
    throw "Applied key size is $keySize bytes (expected 32). Aborting."
}

Write-Host "\nRunning restore script..." -ForegroundColor Cyan
python .\restore_backup_to_nas.py $EncryptedBackupPath
if ($LASTEXITCODE -ne 0) {
    throw "Restore script failed with exit code $LASTEXITCODE"
}

Write-Host "\nVerifying NAS counts..." -ForegroundColor Cyan
$verifyPy = @'
import os
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL", "postgresql+psycopg://sms_user:TestAdmin2026%21@172.16.0.2:55433/student_management?sslmode=disable")
engine = create_engine(db_url)
with engine.connect() as conn:
    s = conn.execute(text("SELECT COUNT(*) FROM students")).scalar_one()
    c = conn.execute(text("SELECT COUNT(*) FROM courses")).scalar_one()
    g = conn.execute(text("SELECT COUNT(*) FROM grades")).scalar_one()
    a = conn.execute(text("SELECT COUNT(*) FROM attendance")).scalar_one()
print(f"students={s}")
print(f"courses={c}")
print(f"grades={g}")
print(f"attendance={a}")
'@

python -c $verifyPy
if ($LASTEXITCODE -ne 0) {
    throw "Count verification failed with exit code $LASTEXITCODE"
}

Write-Host "\n✅ Restore and verification completed." -ForegroundColor Green
