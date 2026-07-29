/**
 * Debug helper: shows which EAS projectId app.config resolves to.
 * Usage: npm run eas:which-project
 */
const config = require('../app.config.js');
const id = config?.expo?.extra?.eas?.projectId;
const OWNER = '05f71ac9-5001-4077-b954-38187c2151cf';

console.log('EXPO_PUBLIC_EAS_PROJECT_ID (env):', process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '(unset)');
console.log('Resolved extra.eas.projectId:', id || '(none — ok to run eas init)');

if (!id) {
  console.log('\nNo project linked. Next: npx eas-cli init  (create a new project on YOUR Expo account)');
} else if (id === OWNER) {
  console.log('\nThis is the repo owner’s Expo project.');
  console.log('Collaborators who are not invited: set in .env → EXPO_PUBLIC_EAS_PROJECT_ID=new');
  console.log('then pull latest and run this script again until it says (none).');
} else {
  console.log('\nUsing a custom Expo project. Next: npx eas-cli credentials');
}
