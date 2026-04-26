-- Table for SKU visits data
CREATE TABLE IF NOT EXISTS sku_visits (
  date DATE NOT NULL,
  sku TEXT NOT NULL,
  unique_visits INTEGER DEFAULT 0,
  PRIMARY KEY (date, sku)
);

-- Table for SKU ads data
CREATE TABLE IF NOT EXISTS sku_ads (
  date DATE NOT NULL,
  sku TEXT NOT NULL,
  ad_orders INTEGER DEFAULT 0,
  ad_spend DECIMAL(10, 2) DEFAULT 0,
  PRIMARY KEY (date, sku)
);

-- Enable RLS
ALTER TABLE sku_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_ads ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Public access for sku_visits" ON sku_visits;
CREATE POLICY "Public access for sku_visits" ON sku_visits USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for sku_ads" ON sku_ads;
CREATE POLICY "Public access for sku_ads" ON sku_ads USING (true) WITH CHECK (true);
