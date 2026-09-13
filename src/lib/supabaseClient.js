import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If no env vars are set, `supabase` is null and the app falls back to the
// local mock data layer (see src/lib/db.js). Set VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY (in .env.local, or as project env vars on
// Vercel/Netlify) to connect the real backend and support real multi-user
// data instead of per-browser localStorage.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const isSupabaseConfigured = !!supabase;
