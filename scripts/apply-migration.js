#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read the migration file
const migrationPath = path.join(
  __dirname,
  "..",
  "migrations",
  "002_fix_wishlist_cascade_delete.sql"
);
const migrationSQL = fs.readFileSync(migrationPath, "utf8");

console.log("Migration SQL to apply:");
console.log("======================");
console.log(migrationSQL);
console.log("======================");
console.log(
  "\nTo apply this migration, run the following command in your Supabase project:"
);
console.log("\n1. Go to your Supabase dashboard");
console.log("2. Navigate to SQL Editor");
console.log("3. Copy and paste the SQL above");
console.log('4. Click "Run" to execute the migration');
console.log("\nAlternatively, if you have the Supabase CLI installed:");
console.log("supabase db push");
