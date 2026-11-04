'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/supabase/client';

export const DEFAULT_WORKSPACE_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'workspace@taskmasterpro.local',
  app_metadata: { provider: 'workspace', providers: ['workspace'] },
  user_metadata: { display_name: 'Workspace' },
  created_at: '2026-01-01T00:00:00.000Z',
} as unknown as User;

type SupabaseContextValue = {
  supabase: SupabaseClient;
  user: User;
  session: Session | null;
  isUserLoading: boolean;
  isConfigured: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const value = useMemo(
    () => ({
      supabase,
      user: DEFAULT_WORKSPACE_USER,
      session: null,
      isUserLoading: false,
      isConfigured: isSupabaseConfigured(),
    }),
    [supabase]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const context = useContext(SupabaseContext);

  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider.');
  }

  return context;
}

export function useSupabaseClient() {
  return useSupabase().supabase;
}

export function useUser() {
  const { user, isUserLoading } = useSupabase();
  return { user, isUserLoading };
}
