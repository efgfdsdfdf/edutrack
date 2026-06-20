const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking Supabase tables...");
  
  // Test profiles
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles check:", pError ? `Error: ${pError.message}` : `Success (${profiles.length} rows)`);

  // Test subscriptions
  const { data: subs, error: sError } = await supabase.from('subscriptions').select('*').limit(1);
  console.log("Subscriptions check:", sError ? `Error: ${sError.message}` : `Success (${subs.length} rows)`);

  // Test user_quotas
  const { data: quotas, error: qError } = await supabase.from('user_quotas').select('*').limit(1);
  console.log("User Quotas check:", qError ? `Error: ${qError.message}` : `Success (${quotas.length} rows)`);
}

check();
