
-- Add logistics_mode to sku_pricing table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sku_pricing' AND column_name='logistics_mode') THEN
        ALTER TABLE public.sku_pricing ADD COLUMN logistics_mode text DEFAULT '海运';
    END IF;
END $$;
