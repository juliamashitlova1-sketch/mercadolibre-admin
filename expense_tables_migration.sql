-- Create fake_orders table
CREATE TABLE IF NOT EXISTS fake_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sku TEXT NOT NULL,
    sku_name TEXT,
    review_fee_cny NUMERIC(10, 2) NOT NULL DEFAULT 0,
    refund_amount_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cargo_damage table
CREATE TABLE IF NOT EXISTS cargo_damage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sku TEXT NOT NULL,
    sku_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL CHECK (reason IN ('送仓差异', '货代丢失', '退货无法二次利用')),
    sku_value_cny NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Assuming existing patterns)
ALTER TABLE fake_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_damage ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (matching existing table patterns in this dev environment)
CREATE POLICY "Allow public access for fake_orders" ON fake_orders FOR ALL USING (true);
CREATE POLICY "Allow public access for cargo_damage" ON cargo_damage FOR ALL USING (true);
