
-- Ensure claims table exists with correct schema
CREATE TABLE IF NOT EXISTS public.claims (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_id text,
    claim_id text,
    order_number text,
    product_name text, -- Added for explicit storage
    reason text, -- Formatted as "request | method @ time"
    status text DEFAULT 'open',
    details jsonb, -- Full form data
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure daily_stats table exists and has reputation column
CREATE TABLE IF NOT EXISTS public.daily_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date DEFAULT CURRENT_DATE UNIQUE,
    total_sales numeric DEFAULT 0,
    total_orders int DEFAULT 0,
    ad_spend numeric DEFAULT 0,
    exchange_rate numeric DEFAULT 0.3891,
    questions int DEFAULT 0,
    claims int DEFAULT 0,
    reputation text DEFAULT '绿色店铺',
    calculated_profit numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON public.claims;
CREATE POLICY "Public Access" ON public.claims FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON public.daily_stats;
CREATE POLICY "Public Access" ON public.daily_stats FOR ALL USING (true);
