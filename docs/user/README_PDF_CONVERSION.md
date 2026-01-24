# User Guide PDF Conversion Instructions

This directory contains comprehensive user guides in Markdown format that need to be converted to PDF for distribution.

## Files

- `SMS_USER_GUIDE_EN.md` - English user guide (comprehensive)
- `SMS_USER_GUIDE_EL.md` - Greek user guide (comprehensive)

## Conversion to PDF

### Method 1: Using Pandoc (Recommended)

Install Pandoc: <https://pandoc.org/installing.html>

```bash
# English PDF

pandoc SMS_USER_GUIDE_EN.md -o ../SMS_User_Guide_EN.pdf --pdf-engine=xelatex -V geometry:margin=1in --toc

# Greek PDF (requires Greek fonts)

pandoc SMS_USER_GUIDE_EL.md -o ../SMS_User_Guide_EL.pdf --pdf-engine=xelatex -V geometry:margin=1in -V mainfont="DejaVu Sans" --toc

```text
### Method 2: Using Markdown to PDF Online Converters

1. **Markdown PDF** (VSCode Extension)
   - Install "Markdown PDF" extension in VSCode
   - Open the .md file
   - Press `Ctrl+Shift+P` → "Markdown PDF: Export (pdf)"

2. **Online Converters**
   - <https://www.markdowntopdf.com/>
   - <https://md2pdf.netlify.app/>
   - Upload the .md file and download the PDF

### Method 3: Using GitHub Actions (Automated)

Create `.github/workflows/generate-docs.yml`:

```yaml
name: Generate User Guide PDFs

on:
  push:
    paths:
      - 'docs/user/SMS_USER_GUIDE_*.md'

jobs:
  convert-to-pdf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Pandoc

        run: |
          sudo apt-get update
          sudo apt-get install -y pandoc texlive-xelatex texlive-fonts-recommended

      - name: Convert English to PDF

        run: |
          pandoc docs/user/SMS_USER_GUIDE_EN.md \
            -o frontend/public/docs/SMS_User_Guide_EN.pdf \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            --toc

      - name: Convert Greek to PDF

        run: |
          pandoc docs/user/SMS_USER_GUIDE_EL.md \
            -o frontend/public/docs/SMS_User_Guide_EL.pdf \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V mainfont="DejaVu Sans" \
            --toc

      - name: Commit PDFs

        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add frontend/public/docs/*.pdf
          git commit -m "Auto-generate user guide PDFs" || echo "No changes"
          git push

```text
## Output Location

PDFs should be placed in:

- `frontend/public/docs/SMS_User_Guide_EN.pdf`
- `frontend/public/docs/SMS_User_Guide_EL.pdf`

This makes them accessible at:

- `<http://localhost:8080/docs/SMS_User_Guide_EN.pdf>`
- `<http://localhost:8080/docs/SMS_User_Guide_EL.pdf>`

## Styling Options

For better PDF appearance, create a custom CSS file (`pdf-style.css`):

```css
body {
  font-family: 'Arial', sans-serif;
  font-size: 11pt;
  line-height: 1.6;
}

h1 {
  color: #4F46E5;
  border-bottom: 2px solid #4F46E5;
  padding-bottom: 0.3em;
}

h2 {
  color: #6366F1;
  border-bottom: 1px solid #E0E7FF;
  padding-bottom: 0.2em;
}

code {
  background-color: #F3F4F6;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

pre {
  background-color: #1F2937;
  color: #F9FAFB;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

table th {
  background-color: #4F46E5;
  color: white;
  padding: 0.5em;
  text-align: left;
}

table td {
  border: 1px solid #E5E7EB;
  padding: 0.5em;
}

```text
Then use:

```bash
pandoc SMS_USER_GUIDE_EN.md -o SMS_User_Guide_EN.pdf \
  --pdf-engine=xelatex \
  --css=pdf-style.css \
  -V geometry:margin=1in \
  --toc

```text
## Manual Conversion Steps

If automated conversion is not available:

1. Open the .md file in a Markdown editor (Typora, MarkText, etc.)
2. Export/Print to PDF using the editor's built-in function
3. Save as `SMS_User_Guide_EN.pdf` or `SMS_User_Guide_EL.pdf`
4. Move to `frontend/public/docs/` directory

## Verification

After conversion, verify:

- [ ] Table of contents is generated correctly
- [ ] All headings are properly formatted
- [ ] Code blocks are readable
- [ ] Tables are formatted correctly
- [ ] Greek characters display properly (for EL version)
- [ ] Links are clickable (if supported by PDF converter)
- [ ] Page numbers are present
- [ ] File size is reasonable (< 5 MB)

## Notes

- The Greek PDF requires proper Unicode font support (DejaVu Sans, Arial Unicode MS)
- PDF generation may take a few seconds depending on document length
- Total pages: ~40-50 for English, ~45-55 for Greek
- Recommended PDF settings: A4 size, 1-inch margins, 11pt font

