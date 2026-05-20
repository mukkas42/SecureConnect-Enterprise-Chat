// Diagnostic: list all auth users and check for the test phone number
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxhqowwmmdsxbowyewou.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4aHFvd3dtbWRzeGJvd3lld291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1NTU2OSwiZXhwIjoyMDkzNjMxNTY5fQ.oeKnSckAGNG8xt3UkfHkcso9ggPmGY9Q3KAJ0rQb0Q8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TEST_PHONE = '+1234567890';

async function main() {
  console.log('=== Checking Supabase Auth Users ===\n');

  // Check if getUserByPhone is available
  console.log('Admin API methods available:', Object.keys(supabase.auth.admin).join(', '));
  console.log('');

  // List all users
  console.log('Listing all auth users...');
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });

  if (error) {
    console.error('listUsers error:', error);
    return;
  }

  console.log(`Total users: ${data.users.length}`);
  data.users.forEach(u => {
    console.log(`  - id: ${u.id} | phone: ${u.phone || 'none'} | email: ${u.email || 'none'} | created: ${u.created_at}`);
  });

  // Check for test phone specifically
  const testUser = data.users.find(u => u.phone === TEST_PHONE);
  if (testUser) {
    console.log(`\n✅ Found test user with phone ${TEST_PHONE}:`, JSON.stringify(testUser, null, 2));
  } else {
    console.log(`\n❌ No user found with phone ${TEST_PHONE}`);
  }

  // Also check the users table
  console.log('\n=== Checking users table ===');
  const { data: dbUsers, error: dbError } = await supabase.from('users').select('*').limit(20);
  if (dbError) {
    console.error('DB error:', dbError);
  } else {
    console.log(`Users in DB table: ${dbUsers.length}`);
    dbUsers.forEach(u => {
      console.log(`  - id: ${u.id} | auth_user_id: ${u.auth_user_id} | phone: ${u.phone_number} | username: ${u.username}`);
    });
  }
}

main().catch(console.error);
