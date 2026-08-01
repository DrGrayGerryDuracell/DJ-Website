#!/usr/bin/env node

/**
 * Static Site Build Script für Cloudflare Pages
 * Verifiziert die Website und bereit sie zum Deployment vor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🏗️  Building static site for Cloudflare Pages...\n');

let errors = [];
let successes = [];

// 1. Verify HTML files exist
console.log('✓ Checking HTML files...');
const requiredFiles = [
  'index.html',
  'bio.html',
  'musik.html',
  'shop.html',
  'kontakt.html',
  'videos.html',
  'control/index.html'
];

for (const file of requiredFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    successes.push(`  ✅ ${file}`);
  } else {
    errors.push(`  ❌ Missing: ${file}`);
  }
}

// 2. Verify config files
console.log('\n✓ Checking Cloudflare config files...');
const configFiles = ['_redirects', '_headers'];

for (const file of configFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    successes.push(`  ✅ ${file} (${size} bytes)`);
  } else {
    errors.push(`  ❌ Missing: ${file}`);
  }
}

// 3. Verify assets
console.log('\n✓ Checking assets directory...');
const assetsPath = path.join(projectRoot, 'assets');
if (fs.existsSync(assetsPath)) {
  const assetCount = fs.readdirSync(assetsPath).length;
  successes.push(`  ✅ assets/ (${assetCount} items)`);
} else {
  errors.push('  ❌ assets/ directory missing');
}

// 4. Verify no large files in root
console.log('\n✓ Checking for large files (max 25MB per file)...');
const files = fs.readdirSync(projectRoot);
const maxSize = 25 * 1024 * 1024; // 25MB

for (const file of files) {
  if (file.startsWith('.') || file === 'node_modules' || file === '.git') continue;

  const filePath = path.join(projectRoot, file);
  const stats = fs.statSync(filePath);

  if (stats.isFile() && stats.size > maxSize) {
    errors.push(`  ❌ File too large: ${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
  }
}

if (!errors.some(e => e.includes('too large'))) {
  successes.push('  ✅ All files within size limits');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('BUILD SUMMARY');
console.log('='.repeat(50));

successes.forEach(msg => console.log(msg));

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(msg => console.log(msg));
  process.exit(1);
} else {
  console.log('\n✅ Build successful! Ready for Cloudflare Pages deployment.\n');
  process.exit(0);
}
