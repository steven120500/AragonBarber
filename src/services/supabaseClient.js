import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Eliminamos cualquier posible barra extra al final de la URL
const cleanUrl = supabaseUrl.replace(/\/$/, "");

export const supabase = createClient(cleanUrl, supabaseAnonKey);