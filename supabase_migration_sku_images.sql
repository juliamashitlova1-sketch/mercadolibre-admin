-- ============================================
-- SKU 图片元数据表迁移脚本
-- 方案 A：创建独立的 sku_images 表
-- 
-- 执行位置：Supabase Dashboard → SQL Editor
-- 重要：此脚本不会删除或修改任何现有数据
-- ============================================

-- Step 1: 创建 sku_images 表
CREATE TABLE IF NOT EXISTS sku_images (
  sku TEXT PRIMARY KEY,
  image_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 启用 RLS（行级安全）
ALTER TABLE sku_images ENABLE ROW LEVEL SECURITY;

-- Step 3: 创建公开读取策略（所有人可查看图片）
CREATE POLICY "Allow public read access on sku_images"
  ON sku_images FOR SELECT
  USING (true);

-- Step 4: 创建公开写入策略（所有人可插入/更新）
CREATE POLICY "Allow public write access on sku_images"
  ON sku_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on sku_images"
  ON sku_images FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 5: 创建公开删除策略
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

-- 验证迁移结果
SELECT '=== 迁移完成 ===' AS status;
SELECT COUNT(*) AS total_sku_images FROM sku_images;
SELECT * FROM sku_images ORDER BY sku;
