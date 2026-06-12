// Script to sync VERSION file to package.json version
const fs = require('fs');
const path = require('path');

const versionFile = path.resolve(__dirname, '../VERSION');
const packageJsonFile = path.resolve(__dirname, './package.json');

try {
  const version = fs.readFileSync(versionFile, 'utf-8').trim();
  const pkg = JSON.parse(fs.readFileSync(packageJsonFile, 'utf-8'));
  if (pkg.version !== version) {
    pkg.version = version;
    fs.writeFileSync(packageJsonFile, JSON.stringify(pkg, null, 2) + '\n');
    console.warn(`Synced frontend/package.json version to ${version}`);
  } else {
    console.warn('Version already in sync.');
  }
} catch (err) {
  console.error('Failed to sync version:', err);
  process.exit(1);
}
