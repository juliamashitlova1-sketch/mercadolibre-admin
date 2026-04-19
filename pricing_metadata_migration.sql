-- Add competitive analysis fields and image support to sku_pricing
ALTER TABLE sku_pricing 
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS competitor_link TEXT,
ADD COLUMN IF NOT EXISTS competitor_price NUMERIC,
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN sku_pricing.model IS '产品型号';
COMMENT ON COLUMN sku_pricing.competitor_link IS '竞品链接';
COMMENT ON COLUMN sku_pricing.competitor_price IS '竞品预估售价';
COMMENT ON COLUMN sku_pricing.image_url IS '产品图片展示链接';
