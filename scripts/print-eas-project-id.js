/**
 * Debug helper: shows which EAS projectId app.config resolves to.
 * Usage: npm run eas:which-project
 */
const OWNER = '05f71ac9-5001-4077-b954-38187c2151cf';
const raw = (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim();

// Re-require after dotenv load inside app.config
delete require.cache[require.resolve('../app.config.js')];
const config = require('../app.config.js');
const id = config?.expo?.extra?.eas?.projectId;

console.log('Raw .env EXPO_PUBLIC_EAS_PROJECT_ID:', raw || '(unset)');
console.log('EXPO_PUBLIC_EAS_I_AM_OWNER:', process.env.EXPO_PUBLIC_EAS_I_AM_OWNER || '(unset)');
console.log('Resolved extra.eas.projectId:', id || '(none — ok to run eas init)');

if (raw === OWNER && process.env.EXPO_PUBLIC_EAS_I_AM_OWNER !== '1') {
  console.log('\n*** PROBLEM FOUND ***');
  console.log('Your .env contains the OWNER project id (05f71ac9-...).');
  console.log('That is why you get Entity not authorized.');
  console.log('Fix: open .env and set EXACTLY:');
  console.log('  EXPO_PUBLIC_EAS_PROJECT_ID=new');
  console.log('Save, then: npx eas-cli init');
} else if (!id) {
  console.log('\nNo project linked. Next: npx eas-cli init (create new project on YOUR account)');
} else {
  console.log('\nLinked. Next: npx eas-cli credentials   then   npx eas-cli build --profile development --platform android');
}
