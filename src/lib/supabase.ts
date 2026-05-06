import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta as any).env.VITE_SUPABASE_URL ||
  "https://popxjdngakindnqmahnl.supabase.co";
const supabaseAnonKey =
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcHhqZG5nYWtpbmRucW1haG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDc0MjEsImV4cCI6MjA5MTg4MzQyMX0.i0VnIyFTJtNb6KfrsOWs6w1R7Y07DlBHiBRLOonEnEI";

// 新数据库（用于链接评价等功能）
const supabaseUrlNew = (import.meta as any).env.VITE_SUPABASE_URL_NEW || "";
const supabaseAnonKeyNew =
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY_NEW || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 如果配置了新数据库，则创建第二个客户端
// 如果没有配置，则 fallback 到旧数据库
export const supabaseNew =
  supabaseUrlNew && supabaseAnonKeyNew
    ? createClient(supabaseUrlNew, supabaseAnonKeyNew)
    : supabase;
