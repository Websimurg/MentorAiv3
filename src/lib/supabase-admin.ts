import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing!');
}

// Note: This client should ONLY be used in server-side contexts (API routes, Server Actions)
// NEVER import this in a client-side component.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
