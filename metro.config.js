// metro.config.js
const { getDefaultConfig } = require("expo/metro-config" );

const config = getDefaultConfig (__dirname);

// Only watch your project, ignore heavy/unnecessary dirs
config.watchFolders  = [__dirname];
config.resolver.blockList = [/.*\/\.git\//, /.*\/__tests__\// ];

module.exports  = config;