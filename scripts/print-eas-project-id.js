/**
 * Debug helper: shows which EAS projectId app.config resolves to.
 * Usage: pnpm eas:which-project
 */
delete require.cache[require.resolve('../app.config.js')];
const config = require('../app.config.js');
const id = config?.expo?.extra?.eas?.projectId;
const raw = (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim();

console.log('Raw EXPO_PUBLIC_EAS_PROJECT_ID:', raw || '(unset)');
console.log('Resolved extra.eas.projectId:', id || '(MISSING — EAS Build will fail)');

if (!id) {
  console.log(
    [
      '',
      'This clone is not linked to an EAS project yet.',
      'Run `npx eas-cli login`, then `npx eas-cli init` and create your own project.',
      'Replace EXPO_PUBLIC_EAS_PROJECT_ID=new in .env with the UUID EAS prints.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log('\nOK — projectId present for EAS.');
