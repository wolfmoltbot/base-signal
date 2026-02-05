import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tmasgeozycsqxsalxviz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtYXNnZW96eWNzcXhzYWx4dml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMwMDMwMiwiZXhwIjoyMDg1ODc2MzAyfQ.dwKsGKjUgqC-goM--ojUG7828A7EAQXFxdAtksQaBck';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

// Check current schema
async function checkSchema() {
  console.log('Checking current schema...\n');
  
  // Check agents table columns
  const { data: agents, error: agentsErr } = await supabase
    .from('agents')
    .select('*')
    .limit(1);
  
  if (agentsErr) {
    console.log('Agents table error:', agentsErr.message);
  } else {
    console.log('Agents columns:', agents.length > 0 ? Object.keys(agents[0]) : 'empty table');
  }
  
  // Check if new tables exist
  const tables = ['deposits', 'withdrawals', 'token_transactions', 'daily_bonuses'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log(`Table '${table}': NOT EXISTS`);
    } else if (error) {
      console.log(`Table '${table}': ERROR - ${error.message}`);
    } else {
      console.log(`Table '${table}': EXISTS`);
    }
  }
}

checkSchema().catch(console.error);
