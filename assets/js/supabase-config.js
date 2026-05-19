window.FirstCodeBlackSupabase = {
  url: 'https://vssvuwllpbnbdgcchzzt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc3Z1d2xscGJuYmRnY2Noenp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIyMDYsImV4cCI6MjA4OTk5ODIwNn0.wI2A6SzjYP0GM1_6C74VtTZwJLpg8BogkPe-WdZAOac'
};

// Initialize the global supabase client. Some pages load this file before the
// Supabase CDN script, so keep retrying briefly instead of failing once.
window.ensureSupabaseClient = function ensureSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(
      window.FirstCodeBlackSupabase.url,
      window.FirstCodeBlackSupabase.anonKey
    );
    return window.supabaseClient;
  }
  return null;
};

if (!window.ensureSupabaseClient()) {
  document.addEventListener('DOMContentLoaded', () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.ensureSupabaseClient() || attempts >= 20) {
        window.clearInterval(timer);
        if (!window.supabaseClient) {
          console.warn('Supabase library not loaded. Authentication features are unavailable.');
        }
      }
    }, 100);
  });
}
