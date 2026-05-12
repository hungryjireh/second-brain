import { registerRootComponent } from 'expo';

import App from './App';
import { indexStyles } from './index.styles';

if (typeof document !== 'undefined') {
  document.documentElement.style.backgroundColor = indexStyles.baseColor;
  document.body.style.backgroundColor = indexStyles.baseColor;
  document.body.style.margin = indexStyles.body.margin;
  const root = document.getElementById('root');
  if (root) root.style.backgroundColor = indexStyles.baseColor;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
