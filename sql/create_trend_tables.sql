-- =============================================
-- 美客多 Supabase (supabaseNew) - 趋势数据建表脚本
-- =============================================

-- =============================================
-- Table 1: sku_crawl_config
-- Stores the SKU crawl configuration (which URL to crawl for each SKU).
-- =============================================

CREATE TABLE IF NOT EXISTS sku_crawl_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  sku_name TEXT DEFAULT '',
  url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_config_sku ON sku_crawl_config (sku);

ALTER TABLE sku_crawl_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有操作" ON sku_crawl_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- Table 2: sku_trend_data
-- Stores the daily trend keyword data crawled for each SKU.
-- =============================================

CREATE TABLE IF NOT EXISTS sku_trend_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  crawl_date DATE NOT NULL,
  keyword TEXT NOT NULL,
  keyword_cn TEXT DEFAULT '',
  traffic_share TEXT DEFAULT '',
  impressions TEXT DEFAULT '',
  ranking TEXT DEFAULT '',
  search_rank TEXT DEFAULT '',
  sales_30d TEXT DEFAULT '',
  search_30d TEXT DEFAULT '',
  competitors TEXT DEFAULT '',
  competition TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trend_data_sku ON sku_trend_data (sku);
CREATE INDEX IF NOT EXISTS idx_trend_data_date ON sku_trend_data (crawl_date DESC);

ALTER TABLE sku_trend_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有操作" ON sku_trend_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
