const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqlwziggdwmbrlazpuhv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbHd6aWdnZHdtYnJsYXpwdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDY1MjcsImV4cCI6MjA4ODY4MjUyN30.XCJ1chcOE76baN5DElJ0_beqWlQK5U1wDJUT_cIviG8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('user_roles').select('*').limit(1);
  console.log('User roles Data:', data, 'Error:', error);
}
check();
