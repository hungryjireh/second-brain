const path = require('path');
const dotenv = require('dotenv');

function loadEnvFile(filePath, override = false) {
  dotenv.config({
    path: filePath,
    override,
    quiet: true,
  });
}

const mobileDir = __dirname;
const repoRoot = path.resolve(mobileDir, '..');

// Load defaults first, then local overrides.
loadEnvFile(path.join(repoRoot, '.env'));
loadEnvFile(path.join(mobileDir, '.env'));
loadEnvFile(path.join(repoRoot, '.env.local'), true);
loadEnvFile(path.join(mobileDir, '.env.local'), true);

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins || []), 'expo-sharing'],
  extra: {
    ...(config.extra || {}),
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  },
});
