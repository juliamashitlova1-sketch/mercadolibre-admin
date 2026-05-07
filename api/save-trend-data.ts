// Vercel serverless function at /api/save-trend-data
// Used by the Tampermonkey script to save crawled data directly to database
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.VITE_SUPABASE_URL_NEW ||
  "https://wfsgmyolllfzawsbxkdh.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY_NEW ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc2dteW9sbGxmemF3c2J4a2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDUwOTcsImV4cCI6MjA5MzYyMTA5N30.mbIf55xLwXAfUAOEbmbYnmCD9h6ryw63mtP4BB_o9qA";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sku, crawl_date, rows } = req.body;
  if (!crawl_date || !rows || !Array.isArray(rows) || rows.length === 0) {
    return res
      .status(400)
      .json({ error: "Missing required fields: crawl_date, rows" });
  }
  const finalSku = sku || "unknown";

  try {
    // Delete old data for this SKU + date
    await supabase
      .from("sku_trend_data")
      .delete()
      .eq("sku", finalSku)
      .eq("crawl_date", crawl_date);

    // Insert new rows
    const inserts = rows.map((row: string[]) => ({
      sku: finalSku,
      crawl_date,
      keyword: row[0] || "",
      keyword_cn: row[1] || "",
      traffic_share: row[2] || "",
      impressions: row[3] || "",
      ranking: row[4] || "",
      search_rank: row[5] || "",
      sales_30d: row[6] || "",
      search_30d: row[7] || "",
      competitors: row[8] || "",
      competition: row[9] || "",
    }));

    const { error, count } = await supabase
      .from("sku_trend_data")
      .insert(inserts);
    if (error) throw error;

    return res.json({ success: true, count: inserts.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
