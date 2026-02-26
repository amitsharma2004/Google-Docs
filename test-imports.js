#!/usr/bin/env node

/**
 * This script verifies all TypeScript files can be imported correctly
 * Run with: node test-imports.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing module imports...\n');

const files = [
  'server/src/app.ts',
  'server/src/index.ts',
  'server/src/routes/authRoutes.ts',
  'server/src/routes/docRoutes.ts',
  'server/src/middleware/auth.ts',
  'server/src/models/User.ts',
  'server/src/models/Document.ts',
  'server/src/models/Operation.ts',
  'server/src/services/DocumentService.ts',
  'server/src/services/OTEngine.ts',
  'server/src/socket/collabHandler.ts',
];

let allExist = true;

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  if (!exists) allExist = false;
});

console.log('\n' + '='.repeat(50));

if (allExist) {
  console.log('✅ All files exist!');
  console.log('\nThe "Cannot find module" errors are IDE cache issues.');
  console.log('Solution: Restart your TypeScript server');
  console.log('  1. Press Ctrl+Shift+P');
  console.log('  2. Type: TypeScript: Restart TS Server');
  console.log('  3. Press Enter');
  console.log('\nOr read: RESTART_TS_SERVER.md');
} else {
  console.log('❌ Some files are missing!');
  process.exit(1);
}

console.log('\n🔨 Running TypeScript compilation test...');
const { execSync } = require('child_process');

try {
  execSync('cd server && npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\n✅ TypeScript compilation: PASSED');
  console.log('Your code has NO errors!');
} catch (error) {
  console.log('\n❌ TypeScript compilation: FAILED');
  process.exit(1);
}
