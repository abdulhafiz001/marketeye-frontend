/**
 * Root entry for Metro — required when using pnpm so resolution is from the project root
 * (default expo/AppEntry.js uses ../../App which breaks inside .pnpm).
 */
import registerRootComponent from 'expo/src/launch/registerRootComponent';

import App from './App';

registerRootComponent(App);
