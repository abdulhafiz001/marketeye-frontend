const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Starting deep clean...');

function deletePath(p) {
  if (fs.existsSync(p)) {
    console.log(`Deleting ${p}...`);
    fs.rmSync(p, { recursive: true, force: true });
  }
}

// 1. Delete caches and artifacts
deletePath('.expo');
deletePath('.open-native');
deletePath('node_modules');
deletePath('package-lock.json');
deletePath('yarn.lock');

// 2. Clear system temp files (heuristic)
try {
  const tempDir = require('os').tmpdir();
  const metroCache = fs.readdirSync(tempDir).filter(f => f.startsWith('metro-') || f.startsWith('haste-'));
  metroCache.forEach(f => deletePath(path.join(tempDir, f)));
} catch (e) {
  console.log('Could not clear system temp files (ignoring)');
}

console.log('📦 Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

console.log('✨ Project cleaned and dependencies installed.');
console.log('🚀 Run "npx expo start --clear" to start the app.');

