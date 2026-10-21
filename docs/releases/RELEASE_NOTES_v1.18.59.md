# Release Notes - Version 1.18.59

**Release Date**: 2026-10-21
**Previous Version**: v1.18.58

## 🐛 Bug Fixes

- **lite**: bundle the DejaVu fonts so PDFs keep their Greek text [857613b]
- **lite**: bundle SQLAlchemy's pure-Python modules, not its Cython .pyd [b4f6076]
- **security**: resolve CodeQL alerts in lite entrypoint and credentials save [0b95540]

## 📝 Documentation

- **plan**: record CodeQL security alert fixes and Dependabot PR maintenance round [d79ed20]
- **plan**: record the v1.18.58 release, its smoke test and the asset verification [3a66cd8]

## 🔨 Build System

- **deps-dev**: bump markdown-it from 15.0.1 to 15.0.3 (#288) [1509763]

## 🤖 CI/CD

- bump actions/stale from 9 to 11 (#281) [5796f51]
- bump docker/metadata-action from 5 to 6 (#279) [274325d]
- bump slackapi/slack-github-action from 2.0.0 to 4.0.0 (#276) [ff700be]
- bump actions/setup-java from 4 to 6 (#274) [be472b0]
- bump actions/setup-python from 6 to 7 (#273) [f03d292]

## 📦 Other Changes

- deps: bump vite 7.3.5 -> 7.3.7 (launch-editor advisories) [c27ac1b]
- deps: bump @babel/plugin-transform-property-literals in /src/frontend (#286) [d132d48]
- deps: bump @babel/plugin-transform-member-expression-literals (#285) [da3f0fb]
- deps: bump @babel/plugin-transform-optional-chaining in /src/frontend (#284) [36defb5]
- deps: bump the npm-minor-patch group in /src/frontend with 54 updates (#283) [0f274a1]
- deps: update pytest requirement from >=9.0.3 to >=9.1.1 in /src/backend (#282) [f05d3a8]
- deps: bump the pip-minor-patch group across 1 directory with 6 updates (#280) [a7d707a]
- deps: bump redis from 5.0.1 to 8.1.0 in /src/backend (#278) [d3fa91a]
- deps: bump reportlab from 4.4.4 to 5.0.1 in /src/backend (#277) [c47d52b]
- deps: update pypdf requirement from >=6.20.0 to >=6.20.1 in /src/backend (#275) [2b9033c]

---

### 📊 Statistics

- **Total Commits**: 21
- **Contributors**: 2


