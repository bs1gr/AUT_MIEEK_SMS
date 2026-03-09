$file = 'frontend/src/features/search/SearchView.test.tsx'
$content = Get-Content $file -Raw

$oldTest = @"
  it('renders search form with type selector', () => {
    mockUseSearch();
    renderComponent();

    expect(screen.getByDisplayValue('students')).toBeInTheDocument();
    expect(screen.getByDisplayValue(20)).toBeInTheDocument();
  });
"@

$newTest = @"
  it('renders search form with type selector', () => {
    mockUseSearch();
    renderComponent();

    const typeSelect = document.getElementById('search-type') as HTMLSelectElement;
    expect(typeSelect).toBeInTheDocument();
    expect(typeSelect.value).toBe('students');

    const limitSelect = document.getElementById('search-limit') as HTMLSelectElement;
    expect(limitSelect).toBeInTheDocument();
    expect(limitSelect.value).toBe('20');
  });
"@

$content = $content -replace [regex]::Escape($oldTest), $newTest
$content | Set-Content $file -Encoding UTF8

Write-Host 'SearchView.test.tsx fixed'
