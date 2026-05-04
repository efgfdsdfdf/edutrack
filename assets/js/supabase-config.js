window.FirstCodeBlackSupabase = {
  url: 'https://vssvuwllpbnbdgcchzzt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc3Z1d2xscGJuYmRnY2Noenp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIyMDYsImV4cCI6MjA4OTk5ODIwNn0.wI2A6SzjYP0GM1_6C74VtTZwJLpg8BogkPe-WdZAOac'
};

// Initialize the global supabase client
if (typeof supabase !== 'undefined') {
  window.supabaseClient = supabase.createClient(window.FirstCodeBlackSupabase.url, window.FirstCodeBlackSupabase.anonKey);
} else {
  console.warn('Supabase library not loaded yet. supabaseClient will need to be initialized manually or wait for load.');
}
