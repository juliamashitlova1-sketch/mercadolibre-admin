-- ============================================
-- SKU 图片完整修复脚本（RLS + Realtime）
-- 
-- 执行位置：Supabase Dashboard → SQL Editor
-- 安全：此脚本可重复执行，不会删除或破坏任何现有数据
-- ============================================

-- Step 1: 确保 sku_images 表存在
CREATE TABLE IF NOT EXISTS sku_images (
  sku TEXT PRIMARY KEY,
  image_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 启用 RLS（行级安全）
ALTER TABLE sku_images ENABLE ROW LEVEL SECURITY;

-- Step 3: 创建公开读取策略（幂等：先删后建）
DROP POLICY IF EXISTS "Allow public read access on sku_images" ON sku_images;
CREATE POLICY "Allow public read access on sku_images"
  ON sku_images FOR SELECT
  USING (true);

-- Step 4: 创建公开写入策略
DROP POLICY IF EXISTS "Allow public write access on sku_images" ON sku_images;
CREATE POLICY "Allow public write access on sku_images"
  ON sku_images FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on sku_images" ON sku_images;
CREATE POLICY "Allow public update access on sku_images"
  ON sku_images FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 5: 创建公开删除策略
DROP POLICY IF EXISTS "Allow public delete access on sku_images" ON sku_images;
CREATE POLICY "Allow public delete access on sku_images"
  ON sku_images FOR DELETE
  USING (true);

-- Step 6: 迁移现有数据 —— 从 sku_stats 中提取每个 SKU 最新的非空 image_url
-- 使用 ON CONFLICT 确保重复执行不会出错
INSERT INTO sku_images (sku, image_url, updated_at)
SELECT DISTINCT ON (sku) 
  sku, 
  image_url, 
  NOW() as updated_at
FROM sku_stats
WHERE image_url IS NOT NULL AND image_url != ''
ORDER BY sku, date DESC
ON CONFLICT (sku) 
DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- Step 7: 启用 Realtime（最关键的一步！）
-- 没有 Realtime，电脑B无法自动收到图片变更通知
-- ============================================

-- 先检查是否已添加，避免重复添加报错
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sku_images'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sku_images;
    RAISE NOTICE '✅ sku_images 已添加到 Realtime';
  ELSE
    RAISE NOTICE 'ℹ️ sku_images 已在 Realtime 中，跳过';
  END IF;
END $$;

-- 验证结果
SELECT '=== 修复完成 ===' AS status;
SELECT COUNT(*) AS total_sku_images FROM sku_images;

-- 验证 Realtime 是否已启用
SELECT schemaname, tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'sku_images';
