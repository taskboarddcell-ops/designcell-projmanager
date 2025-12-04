// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null;

export function getSupabaseInstance() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance;
}

// For backward compatibility, create a lazy getter
export const supabase = new Proxy({}, {
  get: (target, prop) => {
    return getSupabaseInstance()[prop];
  }
})