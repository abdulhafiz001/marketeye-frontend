/**
 * Debug helper: shows which EAS projectId app.config resolves to.
 * Usage: npm run eas:which-project
 */
delete require.cache[require.resolve('../app.config.js')];
const config = require('../app.config.js');
const id = config?.expo?.extra?.eas?.projectId;
const raw = (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim();

console.log('Raw EXPO_PUBLIC_EAS_PROJECT_ID:', raw || '(unset → owner default)');
console.log('Resolved extra.eas.projectId:', id || '(MISSING — EAS Build will fail)');

if (!id) {
  console.log('\nSet EXPO_PUBLIC_EAS_PROJECT_ID to your Expo project UUID (not "new") before building.');
  process.exit(1);
}

console.log('\nOK — projectId present for EAS.');
