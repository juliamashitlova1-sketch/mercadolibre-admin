import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL_NEW || 'https://wfsgmyolllfzawsbxkdh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY_NEW || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc2dteW9sbGxmemF3c2J4a2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDUwOTcsImV4cCI6MjA5MzYyMTA5N30.mbIf55xLwXAfUAOEbmbYnmCD9h6ryw63mtP4BB_o9qA';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { competitorId, price, totalSales, avgRating, listingDate, sales7d, sales30d, reviewCount } = req.body;
  if (!competitorId) return res.status(400).json({ error: 'Missing competitorId' });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('competitor_daily_records').upsert({
      competitor_id: competitorId,
      date: today,
      price: price || 0,
      sales: totalSales || 0,
      review_score: avgRating || 0,
      listing_date: listingDate || '',
      sales_7d: sales7d || 0,
      sales_30d: sales30d || 0,
      review_count: reviewCount || 0,
    }, { onConflict: 'competitor_id,date' });
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
