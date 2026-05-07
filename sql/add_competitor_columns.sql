-- Add new columns to competitor_daily_records
ALTER TABLE competitor_daily_records ADD COLUMN IF NOT EXISTS listing_date TEXT DEFAULT '';
ALTER TABLE competitor_daily_records ADD COLUMN IF NOT EXISTS sales_7d NUMERIC DEFAULT 0;
ALTER TABLE competitor_daily_records ADD COLUMN IF NOT EXISTS sales_30d NUMERIC DEFAULT 0;
ALTER TABLE competitor_daily_records ADD COLUMN IF NOT EXISTS review_count NUMERIC DEFAULT 0;

-- Add unique constraint for upsert
ALTER TABLE competitor_daily_records DROP CONSTRAINT IF EXISTS unique_competitor_date;
ALTER TABLE competitor_daily_records ADD CONSTRAINT unique_competitor_date UNIQUE (competitor_id, date);
