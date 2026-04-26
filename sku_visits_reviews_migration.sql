-- Adding review fields to sku_visits table
ALTER TABLE sku_visits ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE sku_visits ADD COLUMN IF NOT EXISTS negative_reviews INTEGER DEFAULT 0;
ALTER TABLE sku_visits ADD COLUMN IF NOT EXISTS positive_reviews INTEGER DEFAULT 0;

SELECT '✅ 已添加评论相关字段至 sku_visits 表' AS status;
