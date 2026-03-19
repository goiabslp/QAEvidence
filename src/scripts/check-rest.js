const url = 'https://aqlwziggdwmbrlazpuhv.supabase.co/rest/v1/user_roles?limit=1';
const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbHd6aWdnZHdtYnJsYXpwdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDY1MjcsImV4cCI6MjA4ODY4MjUyN30.XCJ1chcOE76baN5DElJ0_beqWlQK5U1wDJUT_cIviG8',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbHd6aWdnZHdtYnJsYXpwdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDY1MjcsImV4cCI6MjA4ODY4MjUyN30.XCJ1chcOE76baN5DElJ0_beqWlQK5U1wDJUT_cIviG8'
};

fetch(url, { headers })
  .then(async r => {
    console.log(r.status);
    console.log(await r.text());
  })
  .catch(err => console.error(err));
