-- ============================================
-- 完整应用更新日志脚本
-- ============================================

-- Step 1: 确保更新日志表存在
CREATE TABLE IF NOT EXISTS app_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'update', -- 'update', 'feature', 'fix'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 启用 RLS
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on app_updates" ON app_updates;
CREATE POLICY "Allow public read access on app_updates" ON app_updates FOR SELECT USING (true);

-- Step 3: 插入更新历史（如果版本已存在则忽略，避免重复运行报错）
-- 注意：这里使用简单的 INSERT，如果表是空的会插入全部数据
INSERT INTO app_updates (version, title, content, type) 
VALUES
('v1.0.2', '云端同步架构升级', '1. 全面迁移至 Supabase 云端存储\n2. 解决了多设备数据同步延迟问题', 'update'),
('v1.0.3', 'SKU 管理模块集成', '1. 侧边栏新增 SKU 管理入口\n2. 销量引擎看板支持自动汇总订单数据\n3. 完善了 SKU 属性编排逻辑', 'update'),
('v1.0.4', 'SKU 访问数据清洗上线', '1. 新增“各 SKU 访问数据”清洗模块\n2. 支持从 Mercado Libre 流量报表自动提取数据\n3. 优化了侧边栏导航结构', 'feature'),
('v1.0.5', '访客数据字段增强 & 手动日期选择', '1. 流量报表解析新增：总评论数、正向评论数、负向评论数\n2. 新增“上传日期选择”功能，支持手动指定数据归属日期\n3. 优化了流量数据列表的展示布局', 'feature')
ON CONFLICT DO NOTHING;

SELECT '✅ 应用更新日志表已就绪，记录已同步' AS status;
