// Apply all migrations to Supabase using the REST API directly
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://sxhqowwmmdsxbowyewou.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4aHFvd3dtbWRzeGJvd3lld291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1NTU2OSwiZXhwIjoyMDkzNjMxNTY5fQ.oeKnSckAGNG8xt3UkfHkcso9ggPmGY9Q3KAJ0rQb0Q8';
const DB_PASSWORD = 'Encryption@123@2026';
const PROJECT_REF = 'sxhqowwmmdsxbowyewou';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

async function main() {
  console.log('=== Testing Supabase Connection ===\n');

  // Try using the postgres schema directly
  const { data, error } = await supabase
    .schema('public')
    .from('users')
    .select('count')
    .limit(1);
  
  console.log('Direct query result:', { data, error: error?.message });

  // Try using rpc to test connection
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('version');
  console.log('RPC version:', { rpcData, error: rpcError?.message });

  // Try information_schema to see what tables exist
  const { data: schemaData, error: schemaError } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public')
    .limit(30);
  
  console.log('\nTables via information_schema:', { schemaData, error: schemaError?.message });
}

main().catch(console.error);
