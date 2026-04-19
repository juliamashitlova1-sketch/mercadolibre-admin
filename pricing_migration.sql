
-- 1. 创建或更新新品核价表
CREATE TABLE IF NOT EXISTS public.sku_pricing (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sku text,
    name text,
    replenishment_qty numeric DEFAULT 0,
    purchase_link text,
    
    -- 财务核心
    selling_price_mxn numeric DEFAULT 0,
    purchase_price_cny numeric DEFAULT 0,
    exchange_rate numeric DEFAULT 0.3891,
    
    -- 费用比率 (小数值 0.175 = 17.5%)
    commission_rate numeric DEFAULT 0.175,
    fixed_fee numeric DEFAULT 0,
    last_mile_fee numeric DEFAULT 0,
    ad_rate numeric DEFAULT 0.08,
    return_rate numeric DEFAULT 0.02,
    tax_rate numeric DEFAULT 0.035,
    
    -- 核价建议与状态
    roi numeric DEFAULT 0,
    margin numeric DEFAULT 0,
    status text DEFAULT 'priced', -- priced (已核价), success (核价成功), staging (暂存箱)
    notes text,

    -- 单箱规格
    box_length numeric DEFAULT 0,
    box_width numeric DEFAULT 0,
    box_height numeric DEFAULT 0,
    pack_count int DEFAULT 1,
    box_count numeric DEFAULT 0,
    box_weight numeric DEFAULT 0,
    
    -- 单品规格
    unit_length numeric DEFAULT 0,
    unit_width numeric DEFAULT 0,
    unit_height numeric DEFAULT 0,
    product_weight numeric DEFAULT 0,
    unit_volumetric_weight numeric DEFAULT 0,
    
    -- 物流信息
    logistics_provider text,
    sea_freight_unit_price numeric DEFAULT 0,
    air_freight_unit_price numeric DEFAULT 0,
    
    volumetric_weight numeric DEFAULT 0, -- 箱抛重
    total_volume numeric DEFAULT 0, 
    total_weight numeric DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 开启 RLS
ALTER TABLE public.sku_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON public.sku_pricing;
CREATE POLICY "Public Access" ON public.sku_pricing FOR ALL USING (true);
