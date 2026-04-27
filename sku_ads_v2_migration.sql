-- Extend sku_ads table for manual data cleaning
ALTER TABLE public.sku_ads ADD COLUMN IF NOT EXISTS target_roas DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sku_ads ADD COLUMN IF NOT EXISTS budget_usd DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sku_ads ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE public.sku_ads ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- Ensure RLS is enabled and policies are set (they should be, but just in case)
ALTER TABLE public.sku_ads ENABLE ROW LEVEL SECURITY;

-- Policy already exists as "Public access for sku_ads" in previous migration, 
-- but adding a fallback just in case.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sku_ads' AND policyname = 'Enable all actions for all users on sku_ads'
    ) THEN
        CREATE POLICY "Enable all actions for all users on sku_ads" ON public.sku_ads
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
