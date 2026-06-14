import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Standard client for authenticated dashboard/server calls
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to create a client for a specific visitor session
// This injects the 'x-session-id' header which is required by our Row Level Security (RLS) policies
export function createVisitorSupabaseClient(sessionId: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-session-id': sessionId,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}
