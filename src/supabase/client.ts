'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      // When env vars are missing return a no-op stub so the app renders
      // without crashing. All auth operations will fail gracefully via the
      // isConfigured() guard in auth-form and auth-provider.
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[TaskMaster Pro] NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.\n' +
            'Copy .env.example to .env.local and fill in your project credentials.\n' +
            'Sign-in will not work until these are configured.'
        );
      }
      return createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }

    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Required for Google OAuth: picks up the PKCE code from the URL after redirect
        detectSessionInUrl: true,
        // PKCE is more secure than implicit flow for server-side rendered apps
        flowType: 'pkce',
      },
    });
  }

  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
