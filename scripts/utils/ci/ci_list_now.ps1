# One-shot: list open issues labeled 'ci-failure' and save to scripts/utils/ci/ci_issues_now.json
$OutFile = "$PSScriptRoot/ci_issues_now.json"
try {
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        $issues = gh issue list --label ci-failure --repo bs1gr/AUT_MIEEK_SMS --state open --limit 100 --json number,title,url,createdAt | ConvertFrom-Json
        $issues | ConvertTo-Json -Depth 4 | Out-File -FilePath $OutFile -Encoding utf8
    } else {
        if (-not $env:GITHUB_TOKEN) {
            'GH_CLI_NOT_AVAILABLE_AND_GITHUB_TOKEN_NOT_SET' | Out-File -FilePath $OutFile -Encoding utf8
        } else {
            $u = 'https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/issues?labels=ci-failure&state=open&per_page=100'
            $hdr = @{ Authorization = ("token $env:GITHUB_TOKEN"); 'User-Agent' = 'ci-monitor' }
            $resp = Invoke-RestMethod -Uri $u -Headers $hdr -UseBasicParsing
            $out = $resp | ForEach-Object { [PSCustomObject]@{ number = $_.number; title = $_.title; url = $_.html_url; createdAt = $_.created_at } }
            $out | ConvertTo-Json -Depth 4 | Out-File -FilePath $OutFile -Encoding utf8
        }
    }
} catch {
    "ERROR: $_" | Out-File -FilePath $OutFile -Encoding utf8
}
# Print a short human summary
$data = Get-Content -Path $OutFile -Raw
if ($data -and $data -ne 'GH_CLI_NOT_AVAILABLE_AND_GITHUB_TOKEN_NOT_SET') {
    try {
        $arr = $data | ConvertFrom-Json
        if ($arr -is [System.Management.Automation.PSCustomObject]) { $arr = ,$arr }
        Write-Host "Found $($arr.Count) ci-failure issues:"
        foreach ($i in $arr) {
            Write-Host "#$($i.number): $($i.title) - $($i.url) - created: $($i.createdAt)"
        }
    } catch {
        Write-Host "No JSON issues found. Raw output:"
        Write-Host $data
    }
} else {
    Write-Host $data
}
