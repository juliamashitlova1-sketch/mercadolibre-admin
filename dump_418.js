import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpData() {
  const { data, error } = await supabase
    .from('sku_stats')
    .select('*')
    .eq('date', '2026-04-18');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

dumpData();
