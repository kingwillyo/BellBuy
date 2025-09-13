#!/usr/bin/env node

/**
 * Script to replace console.log statements with secure logging
 * This script helps identify and replace console logging with the secure logger
 */

const fs = require("fs");
const path = require("path");

// Files to process (excluding node_modules, .git, etc.)
const filesToProcess = ["app", "components", "hooks", "lib"];

// Console log patterns to replace
const replacements = [
  {
    pattern: /console\.log\(/g,
    replacement: "logger.debug(",
  },
  {
    pattern: /console\.warn\(/g,
    replacement: "logger.warn(",
  },
  {
    pattern: /console\.error\(/g,
    replacement: "logger.error(",
  },
  {
    pattern: /console\.info\(/g,
    replacement: "logger.info(",
  },
];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return (
    [".ts", ".tsx", ".js", ".jsx"].includes(ext) &&
    !filePath.includes("node_modules") &&
    !filePath.includes(".git") &&
    !filePath.includes("dist") &&
    !filePath.includes("build")
  );
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    // Check if file already imports logger
    const hasLoggerImport =
      content.includes("import { logger }") ||
      content.includes('from "./logger"');

    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    // Add logger import if needed and file was modified
    if (modified && !hasLoggerImport) {
      // Find the last import statement
      const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
      const imports = content.match(importRegex);

      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;

        // Determine relative path to logger
        const relativePath = path.relative(
          path.dirname(filePath),
          "lib/logger"
        );
        const importPath = relativePath.startsWith(".")
          ? relativePath
          : `./${relativePath}`;

        content =
          content.slice(0, insertIndex) +
          `\nimport { logger } from "${importPath}";` +
          content.slice(insertIndex);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Processed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let processedCount = 0;

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processedCount += walkDirectory(filePath);
    } else if (shouldProcessFile(filePath)) {
      if (processFile(filePath)) {
        processedCount++;
      }
    }
  });

  return processedCount;
}

// Main execution
console.log("🔍 Scanning for console.log statements...\n");

let totalProcessed = 0;
filesToProcess.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Processing directory: ${dir}`);
    totalProcessed += walkDirectory(dir);
  } else {
    console.log(`⚠️  Directory not found: ${dir}`);
  }
});

console.log(`\n✨ Processing complete! Modified ${totalProcessed} files.`);
console.log("\n📋 Next steps:");
console.log("1. Review the changes to ensure they look correct");
console.log("2. Test your app to make sure logging still works");
console.log(
  "3. Remove any remaining console.log statements manually if needed"
);
console.log("4. Consider adding proper error boundaries for production");
