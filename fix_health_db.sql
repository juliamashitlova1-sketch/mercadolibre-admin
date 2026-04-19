
-- 1. Fix 'claims' table: Add missing columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='details') THEN
        ALTER TABLE public.claims ADD COLUMN details jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='product_name') THEN
        ALTER TABLE public.claims ADD COLUMN product_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='doc_id') THEN
        ALTER TABLE public.claims ADD COLUMN doc_id text;
    END IF;
END $$;

-- 2. Fix 'daily_stats' table: Ensure reputation column is text and has default
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_stats' AND column_name='reputation') THEN
        ALTER TABLE public.daily_stats ADD COLUMN reputation text DEFAULT '绿色店铺';
    ELSE
        -- If it exists, ensure it can hold the long text and has correct default
        ALTER TABLE public.daily_stats ALTER COLUMN reputation SET DEFAULT '绿色店铺';
    END IF;
END $$;

-- 3. Refresh policies
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON public.claims;
CREATE POLICY "Public Access" ON public.claims FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON public.daily_stats;
CREATE POLICY "Public Access" ON public.daily_stats FOR ALL USING (true);
