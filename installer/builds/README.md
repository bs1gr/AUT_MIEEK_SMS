# Installer Build Records

This directory tracks metadata for installer builds without storing the binary files themselves.

## Purpose

- **Track Build History**: Record what was built, when, and from which commit
- **Verification**: Provide SHA256 checksums for installer integrity verification
- **Feature Documentation**: Document what features are included in each build
- **Build Reproducibility**: Enable recreation of build environment if needed

## File Format

Each build is recorded as `vX.Y.Z.json` containing:
- Version and build timestamp
- Git commit hash and message
- Installer file metadata (filename, size, SHA256)
- Code signing information
- Feature list (primary and technical)
- Validation status (tests, smoke tests, build checks)
- Build environment details

## Distribution Method

Installers are **not committed to git** (they are gitignored). Distribution methods:
- **Recommended**: Upload to GitHub Releases
- **Local Testing**: Available in `dist/` directory
- **Manual Distribution**: Share installer + SHA256 file together

## Usage

**View build metadata:**
```powershell
Get-Content .\installer\builds\v1.18.8.json | ConvertFrom-Json | Format-List
```

**Verify installer integrity:**
```powershell
# Compare SHA256 from metadata with actual file
$metadata = Get-Content .\installer\builds\v1.18.8.json | ConvertFrom-Json
$actual = (Get-FileHash .\dist\SMS_Installer_1.18.8.exe -Algorithm SHA256).Hash
if ($actual -eq $metadata.installer.sha256) {
    Write-Host "✓ Installer integrity verified"
} else {
    Write-Host "✗ Integrity check failed"
}
```

**List all builds:**
```powershell
Get-ChildItem .\installer\builds\*.json | ForEach-Object {
    $build = Get-Content $_.FullName | ConvertFrom-Json
    [PSCustomObject]@{
        Version = $build.version
        Date = $build.buildDate
        Commit = $build.commitShort
        Size = $build.installer.sizeHuman
    }
} | Format-Table -AutoSize
```

## Build Workflow

1. **Build Installer**: `.\INSTALLER_BUILDER.ps1 -Action build -Version "X.Y.Z"`
2. **Generate SHA256**: Automatic during build process
3. **Create Metadata**: `installer/builds/vX.Y.Z.json` (this directory)
4. **Commit Metadata**: `git add installer/builds/vX.Y.Z.json && git commit`
5. **Distribute**: Upload to GitHub Releases or share manually

## Policy Reference

See `.github/copilot-instructions.md` Policy 9 for release artifact procedures.
