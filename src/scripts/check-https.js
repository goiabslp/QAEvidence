const https = require('https');

const options = {
  hostname: 'aqlwziggdwmbrlazpuhv.supabase.co',
  port: 443,
  path: '/rest/v1/user_roles?limit=1',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbHd6aWdnZHdtYnJsYXpwdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDY1MjcsImV4cCI6MjA4ODY4MjUyN30.XCJ1chcOE76baN5DElJ0_beqWlQK5U1wDJUT_cIviG8',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbHd6aWdnZHdtYnJsYXpwdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDY1MjcsImV4cCI6MjA4ODY4MjUyN30.XCJ1chcOE76baN5DElJ0_beqWlQK5U1wDJUT_cIviG8'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', e => console.error(e));
req.end();
