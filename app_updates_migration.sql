-- Table for application version updates
CREATE TABLE IF NOT EXISTS app_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'update', -- 'update', 'feature', 'fix'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
DROP POLICY IF EXISTS "Allow public read access on app_updates" ON app_updates;
CREATE POLICY "Allow public read access on app_updates" ON app_updates FOR SELECT USING (true);

-- Insert initial update history
INSERT INTO app_updates (version, title, content, type) VALUES
('v1.0.4', 'SKU 访问数据清洗上线', '1. 新增“各 SKU 访问数据”清洗模块\n2. 支持从 Mercado Libre 流量报表自动提取数据\n3. 优化了侧边栏导航结构', 'feature'),
('v1.0.3', 'SKU 管理模块集成', '1. 侧边栏新增 SKU 管理入口\n2. 销量引擎看板支持自动汇总订单数据\n3. 完善了 SKU 属性编排逻辑', 'update'),
('v1.0.2', '云端同步架构升级', '1. 全面迁移至 Supabase 云端存储\n2. 解决了多设备数据同步延迟问题', 'update');
