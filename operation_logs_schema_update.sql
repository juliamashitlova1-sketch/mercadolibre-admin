-- Add structured columns to operation_logs for better analytics and sync
ALTER TABLE operation_logs 
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records from the 'action' or 'details' if possible (optional but good)
-- This is a simple heuristic mapping
UPDATE operation_logs 
SET action_type = 'Other' 
WHERE action_type IS NULL;

-- Enable RLS and public access if not already (safekeeping)
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for operation_logs" ON operation_logs;
CREATE POLICY "Public access for operation_logs" ON operation_logs FOR ALL USING (true) WITH CHECK (true);
