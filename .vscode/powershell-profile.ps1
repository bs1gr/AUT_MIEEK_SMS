# PowerShell Profile for Student Management System
# This file configures PowerShell for proper UTF-8 encoding and clean output

# Set UTF-8 encoding for all output
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Set default encoding for Out-File and other cmdlets
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Set code page to UTF-8 (65001)
chcp 65001 > $null

# Disable progress bars for cleaner output (prevents ψ characters)
$ProgressPreference = 'SilentlyContinue'
$VerbosePreference = 'SilentlyContinue'
$DebugPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'

# Suppress verbose output from git and debugging messages
$env:GIT_TERMINAL_PROMPT = "0"
$env:TERM = "dumb"  # Disable fancy terminal features

# Set Git to use UTF-8
$env:LESSCHARSET = "utf-8"

# Clear any stray terminal state
[Console]::ResetColor()
Clear-Host

# Clean output format (fallback for Windows PowerShell without PSStyle)
if ($PSStyle -and $PSStyle.PSObject.Properties.Name -contains 'OutputRendering') {
	$PSStyle.OutputRendering = 'PlainText'
}

# Ensure Ctrl+L (and cls alias) reliably clear the screen without stray characters (ψ)
if (Get-Module -ListAvailable -Name PSReadLine) {
	Set-PSReadLineKeyHandler -Key Ctrl+l -Function ClearScreen
	# Disable history during paste (prevents line wrapping issues). PasteAsPlainText
	# is not available in older PSReadLine versions, so use the standard Paste
	# handler for compatibility.
	Set-PSReadLineKeyHandler -Key Ctrl+v -Function Paste
}

# Enable VS Code shell integration for richer command detection when running
# inside the VS Code terminal.
if ($env:TERM_PROGRAM -eq "vscode") {
	. "$(code --locate-shell-integration-path pwsh)"
}
# Only set alias if not already defined (avoids AllScope errors on Windows PowerShell)
if (-not (Get-Command cls -ErrorAction SilentlyContinue)) {
	Set-Alias cls Clear-Host
}

# Keep the prompt simple (prevents hidden characters that can confuse command detection)
function global:prompt {
	"PS > "
}

Write-Host "PowerShell profile loaded - UTF-8 encoding configured" -ForegroundColor Green
