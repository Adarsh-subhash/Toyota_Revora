import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://lasgslovtouglglqynmz.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhc2dzbG92dG91Z2xnbHF5bm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjM5ODEsImV4cCI6MjA5NTczOTk4MX0.59DtF4CPqptm6AgpOcRCGR23b4igx4407W9S4L2hAaM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
