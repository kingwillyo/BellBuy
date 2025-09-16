// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Performance optimizations
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /.*\/\.git\//,
  /.*\/__tests__\//,
  /.*\/node_modules\/.*\/node_modules\//,
  /.*\/\.expo\//,
  /.*\/android\/build\//,
  /.*\/ios\/build\//,
];

// Enable Hermes optimizations
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Remove custom module ID factory - this was causing the "Unknown named module" error
// Let Metro use its default module ID generation

// Enable tree shaking
config.transformer.enableBabelRCLookup = false;

module.exports = config;
