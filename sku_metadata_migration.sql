-- ============================================
-- SKU 元数据增强脚本 (Global Metadata Sync)
-- 
-- 执行位置：Supabase Dashboard → SQL Editor
-- 将原本分散在各个浏览器 localStorage 中的静态信息收归云端，解决多设备数据不一致问题
-- ============================================

-- Step 1: 创建 sku_metadata 表
CREATE TABLE IF NOT EXISTS sku_metadata (
  sku TEXT PRIMARY KEY,
  name TEXT,
  purchase_price DECIMAL,
  listed_at DATE,
  status TEXT DEFAULT '在售',
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 迁移现有图片数据（如果存在之前的 sku_images 表）
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sku_images') THEN
    INSERT INTO sku_metadata (sku, image_url, updated_at)
    SELECT sku, image_url, updated_at FROM sku_images
    ON CONFLICT (sku) DO UPDATE SET 
      image_url = EXCLUDED.image_url,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- Step 3: 启用 RLS
ALTER TABLE sku_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for sku_metadata" ON sku_metadata;
CREATE POLICY "Public access for sku_metadata" ON sku_metadata
  USING (true)
  WITH CHECK (true);

-- Step 4: 启用 Realtime 原力同步
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sku_metadata'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sku_metadata;
  END IF;
END $$;

SELECT '✅ 数据库元数据表已就绪' AS status;
