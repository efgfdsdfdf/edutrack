const { createClient } = require('@supabase/supabase-js');

const URL = 'https://vssvuwllpbnbdgcchzzt.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc3Z1d2xscGJuYmRnY2Noenp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIyMDYsImV4cCI6MjA4OTk5ODIwNn0.wI2A6SzjYP0GM1_6C74VtTZwJLpg8BogkPe-WdZAOac';

const supabase = createClient(URL, ANON_KEY);

async function check() {
  console.log("Querying active database...");
  const { data, error } = await supabase.from('notes').select('*').limit(1);
  if (error) {
    console.error("Notes query failed:", error.message);
  } else {
    console.log("Notes query succeeded, returned rows:", data.length);
  }
}

check();
