const URL1 = "https://popxjdngakindnqmahnl.supabase.co/rest/v1/sku_stats?select=count";
const URL2 = "https://popxjdngakindnqmahnl.supabase.co/rest/v1/sku_metadata?select=count";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcHhqZG5nYWtpbmRucW1haG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDc0MjEsImV4cCI6MjA5MTg4MzQyMX0.i0VnIyFTJtNb6KfrsOWs6w1R7Y07DlBHiBRLOonEnEI";

const headers = { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY, "Prefer": "count=exact" };

Promise.all([
  fetch(URL1, { headers }).then(r => ({ table: 'sku_stats', count: r.headers.get('content-range') })),
  fetch(URL2, { headers }).then(r => ({ table: 'sku_metadata', count: r.headers.get('content-range') }))
]).then(results => {
  results.forEach(res => {
    console.log(`${res.table} range: ${res.count}`);
  });
}).catch(console.error);
