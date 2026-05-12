import { registerRootComponent } from 'expo';

import App from './App';

if (typeof document !== 'undefined') {
  const baseColor = '#0d0d0d';
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
