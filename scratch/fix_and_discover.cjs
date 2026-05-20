// Fix script: clean up the duplicate auth user and check DB schema
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxhqowwmmdsxbowyewou.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4aHFvd3dtbWRzeGJvd3lld291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1NTU2OSwiZXhwIjoyMDkzNjMxNTY5fQ.oeKnSckAGNG8xt3UkfHkcso9ggPmGY9Q3KAJ0rQb0Q8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  // The issue: Supabase stores phone WITHOUT '+' but we search with '+'
  // User f4746b79 has phone '1234567890' (no +), we search for '+1234567890'
  
  // Delete the broken test user from Auth so mock flow can re-create it cleanly
  const badUserId = 'f4746b79-323f-4d53-9ce5-5cd6495ce2f5';
  console.log(`Deleting broken auth user ${badUserId}...`);
  const { error: delError } = await supabase.auth.admin.deleteUser(badUserId);
  if (delError) {
    console.error('Delete error:', delError);
  } else {
    console.log('✅ Deleted successfully');
  }

  // Check what tables exist in the database
  console.log('\n=== Checking available tables ===');
  const { data: tables, error: tblError } = await supabase
    .rpc('version'); // just a connectivity check
  
  // Try different table names
  for (const tableName of ['users', 'profiles', 'user_profiles', 'chat_users']) {
    const { data, error } = await supabase.from(tableName).select('id').limit(1);
    if (!error) {
      console.log(`✅ Table '${tableName}' exists`);
      const { data: allRows } = await supabase.from(tableName).select('*').limit(5);
      console.log('   Sample rows:', JSON.stringify(allRows, null, 2));
    } else {
      console.log(`❌ Table '${tableName}': ${error.message}`);
    }
  }
}

main().catch(console.error);
