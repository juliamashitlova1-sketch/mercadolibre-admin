
-- Add operation_status to sku_pricing table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sku_pricing' AND column_name='operation_status') THEN
        ALTER TABLE public.sku_pricing ADD COLUMN operation_status text DEFAULT '待采购';
    END IF;
END $$;

-- Also ensure statuses are indexable if needed
CREATE INDEX IF NOT EXISTS idx_sku_pricing_operation_status ON public.sku_pricing(operation_status);
