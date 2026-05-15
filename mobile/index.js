import { registerRootComponent } from 'expo';

import App from './App';
import { theme } from './src/theme';

if (typeof document !== 'undefined') {
  const baseColor = theme.colors.bgBase;
  document.documentElement.style.backgroundColor = baseColor;
  document.body.style.backgroundColor = baseColor;
  document.body.style.margin = '0';
  const root = document.getElementById('root');
  if (root) root.style.backgroundColor = baseColor;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
