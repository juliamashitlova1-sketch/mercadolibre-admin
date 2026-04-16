import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://popxjdngakindnqmahnl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcHhqZG5nYWtpbmRucW1haG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDc0MjEsImV4cCI6MjA5MTg4MzQyMX0.i0VnIyFTJtNb6KfrsOWs6w1R7Y07DlBHiBRLOonEnEI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
