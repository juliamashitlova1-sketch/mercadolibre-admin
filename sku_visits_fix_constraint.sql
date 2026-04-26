-- ============================================
-- 修复：移除 SKU 访问数据表的强关联约束
-- ============================================

-- 移除外键约束，允许记录尚未在 sku_metadata 中注册的 SKU 流量数据
ALTER TABLE sku_visits DROP CONSTRAINT IF EXISTS sku_visits_sku_fkey;
ALTER TABLE sku_ads DROP CONSTRAINT IF EXISTS sku_ads_sku_fkey;

-- 确保主键和索引正确（保持原样）
-- PRIMARY KEY (date, sku) 已在创建时定义

SELECT '✅ 已移除外键约束，现在可以上传任何 SKU 的流量数据' AS status;
