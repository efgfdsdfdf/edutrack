const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Users\\ezeil\\OneDrive\\Desktop\\first_code_black_pwa\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, email, role, username');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Current users:');
  console.table(profiles);
}

listUsers();
