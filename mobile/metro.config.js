const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-web/dist/exports/DeviceEventEmitter': path.resolve(
    __dirname,
    'node_modules/react-native-web/dist/exports/DeviceEventEmitter'
  ),
};

module.exports = config;
