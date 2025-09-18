#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read the migration file
const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20250918111006_create_feedback_table.sql"
);

try {
  const migrationSQL = fs.readFileSync(migrationPath, "utf8");

  console.log("Feedback Table Migration SQL:");
  console.log("=============================");
  console.log(migrationSQL);
  console.log("=============================");
  console.log(
    "\nTo apply this migration, run the following command in your Supabase project:"
  );
  console.log("\n1. Go to your Supabase dashboard");
  console.log("2. Navigate to SQL Editor");
  console.log("3. Copy and paste the SQL above");
  console.log('4. Click "Run" to execute the migration');
  console.log("\nAlternatively, if you have the Supabase CLI installed:");
  console.log("supabase db push");
  console.log(
    "\nThis will create the 'feedback' table with the following features:"
  );
  console.log("- Stores user feedback submissions");
  console.log("- Tracks selected feedback subjects");
  console.log("- Includes status tracking for admin workflow");
  console.log("- Has proper RLS policies for security");
  console.log("- Includes indexes for performance");
} catch (error) {
  console.error("Error reading migration file:", error.message);
  console.log("\nMake sure the migration file exists at:");
  console.log(migrationPath);
}
