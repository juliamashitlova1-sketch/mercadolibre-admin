import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function summarizeSkus() {
  console.log('--- SKU Summary across Tables ---');

  const tables = ['skus', 'sku_metadata', 'sku_stats', 'sku_ads', 'sku_visits', 'cleaned_orders'];
  const allSkusSet = new Set();
  const summary = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('sku');
      if (error) {
        if (error.code === '42P01') {
          console.log(`Table "${table}" does not exist.`);
        } else {
          console.error(`Error fetching from ${table}:`, error.message);
        }
        continue;
      }

      const skus = [...new Set(data.map(item => item.sku))];
      summary[table] = skus;
      skus.forEach(s => allSkusSet.add(s));
      console.log(`Table "${table}": ${skus.length} unique SKUs found.`);
    } catch (err) {
      console.error(`Error in ${table}:`, err);
    }
  }

  console.log('\n--- All Unique SKUs Found ---');
  console.log(Array.from(allSkusSet).sort().join(', '));

  console.log('\n--- SKUs in History but NOT in Management (skus table) ---');
  const managedSkus = new Set(summary['skus'] || []);
  const historicalOnly = Array.from(allSkusSet).filter(s => !managedSkus.has(s));
  console.log(historicalOnly.length > 0 ? historicalOnly.sort().join(', ') : 'None');
}

summarizeSkus();
