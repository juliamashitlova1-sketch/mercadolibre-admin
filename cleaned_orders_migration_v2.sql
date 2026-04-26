-- Add columns to the cleaned_orders table if they do not exist
ALTER TABLE public.cleaned_orders 
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'valid';
