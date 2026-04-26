-- Create cleaned_orders table
CREATE TABLE IF NOT EXISTS public.cleaned_orders (
    order_id text PRIMARY KEY,
    order_date text NOT NULL,
    units integer NOT NULL DEFAULT 1,
    buyer_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cleaned_orders ENABLE ROW LEVEL SECURITY;

-- Create blanket policies for authenticated and anon users (simple setup matching existing)
CREATE POLICY "Enable all actions for all users" ON public.cleaned_orders
    FOR ALL USING (true) WITH CHECK (true);
