import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** false until the two values are put in the .env file */
export const configured = !!(url && key && !String(url).includes('YOUR-PROJECT') && !String(key).includes('YOUR-ANON'));

export const supabase = createClient(configured ? url : 'http://localhost:54321', configured ? key : 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
