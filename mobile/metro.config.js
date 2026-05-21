// Metro config for the HailGuard monorepo.
// Lets the Expo app resolve the @hailguard/shared workspace from the repo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes to shared/ trigger reloads.
config.watchFolders = [monorepoRoot];

// Resolve node_modules from the app first, then the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Map the shared workspace to its TypeScript source.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@hailguard/shared': path.resolve(monorepoRoot, 'shared/src'),
};

module.exports = config;
