-- Add status column to skus table
ALTER TABLE skus ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '活跃中';

-- Update types if needed (optional)
-- COMMENT ON COLUMN skus.status IS 'SKU 状态: 活跃中, 补货中, 缺货';
