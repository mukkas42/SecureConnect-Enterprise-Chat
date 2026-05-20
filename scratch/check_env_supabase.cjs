// Check Supabase tables using credentials from .env
const { createClient } = require('@supabase/supabase-js');

// Credentials from .env
const SUPABASE_URL = 'https://sxhqowwmmdsxbowyewou.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4aHFvd3dtbWRzeGJvd3lld291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1NTU2OSwiZXhwIjoyMDkzNjMxNTY5fQ.oeKnSckAGNG8xt3UkfHkcso9ggPmGY9Q3KAJ0rQb0Q8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('=== Supabase Project: sxhqowwmmdsxbowyewou ===');
  console.log(`URL: ${SUPABASE_URL}\n`);

  // 1. Check what PostgREST exposes (the schema cache)
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const swagger = await resp.json().catch(() => ({}));
  const tableNames = swagger.paths
    ? Object.keys(swagger.paths)
        .filter(p => p.startsWith('/') && !p.includes('{') && !p.includes('rpc'))
        .map(p => p.replace(/^\//, ''))
    : [];

  console.log(`Tables visible via PostgREST schema cache (${tableNames.length} found):`);
  if (tableNames.length === 0) {
    console.log('  (none — migrations may not have been applied to this Supabase project)');
  } else {
    tableNames.sort().forEach(t => console.log(`  - ${t}`));
  }

  // 2. Probe known table names
  const candidates = ['users', 'profiles', 'user_profiles', 'chat_users', 'accounts', 'members'];
  console.log('\nProbing candidate table names directly:');
  for (const name of candidates) {
    const { data, error } = await supabase.from(name).select('*').limit(3);
    if (!error) {
      console.log(`  ✅ "${name}" EXISTS`);
      if (data && data.length > 0) {
        console.log('     Columns:', Object.keys(data[0]).join(', '));
        data.forEach(r => console.log('     Row:', JSON.stringify(r)));
      } else {
        console.log('     (table empty)');
      }
    } else {
      console.log(`  ❌ "${name}": ${error.message}`);
    }
  }

  // 3. List Supabase Auth users
  console.log('\n=== Supabase Auth Users ===');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (authErr) {
    console.error('Auth list error:', authErr.message);
  } else {
    console.log(`Total auth users: ${authData.users.length}`);
    authData.users.forEach(u => {
      console.log(`  id=${u.id} | phone="${u.phone}" | confirmed=${u.phone_confirmed_at ? 'yes' : 'no'}`);
    });
  }
}

main().catch(console.error);
