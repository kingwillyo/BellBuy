// Test script to verify Supabase relationships work
// Run this in your browser console or as a test

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

// Test the exact query that's failing
async function testSellerOrdersQuery() {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        buyer:profiles!buyer_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `
      )
      .limit(1);

    if (error) {
      console.error("Query failed:", error);
      return false;
    }

    console.log("Query succeeded:", data);
    return true;
  } catch (err) {
    console.error("Exception:", err);
    return false;
  }
}

// Alternative query using explicit join
async function testAlternativeQuery() {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        profiles!buyer_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `
      )
      .limit(1);

    if (error) {
      console.error("Alternative query failed:", error);
      return false;
    }

    console.log("Alternative query succeeded:", data);
    return true;
  } catch (err) {
    console.error("Alternative query exception:", err);
    return false;
  }
}

// Run tests
testSellerOrdersQuery();
testAlternativeQuery();
