$errors = $null
try {
    [void][System.Management.Automation.Language.Parser]::ParseFile("COMMIT_READY.ps1", [ref]$errors, [ref]$null)
    if ($errors) {
        Write-Host "PARSE_ERRORS: $($errors.Count)"
        $i = 0
        foreach ($e in $errors) {
            $i++
            Write-Host "--- Error #$i ---"
            Write-Host "Message : $($e.Message)"
            Write-Host "Start   : $($e.Extent.StartLineNumber):$($e.Extent.StartColumnNumber)"
            Write-Host "End     : $($e.Extent.EndLineNumber):$($e.Extent.EndColumnNumber)"
            Write-Host "Text    : $($e.Extent.Text -replace "`r`n","\n")"
        }
        exit 1
    } else {
        Write-Host "PARSE_OK"
        exit 0
    }
}
catch {
    Write-Host "PARSER THROW: $_"
    exit 2
}
