'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/supabase/client';

type SupabaseContextValue = {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
  isConfigured: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsUserLoading(false);
      return;
    }

    let isMounted = true;
    let subscription: any = null;

    try {
      // 3-second session fetch timeout (e.g. cold-starts, slow network)
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session retrieval timed out')), 3000)
      );

      Promise.race([sessionPromise, timeoutPromise])
        .then(({ data }) => {
          if (!isMounted) return;
          setSession(data?.session ?? null);
          setUser(data?.session?.user ?? null);
          setIsUserLoading(false);
        })
        .catch((err) => {
          console.warn('[SupabaseProvider] session fetch or timeout:', err);
          if (isMounted) {
            setIsUserLoading(false);
          }
        });

      const res = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsUserLoading(false);
      });

      if (res && res.data && res.data.subscription) {
        subscription = res.data.subscription;
      }
    } catch (err) {
      console.error('[SupabaseProvider] auth initialization error:', err);
      setIsUserLoading(false);
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      supabase,
      user,
      session,
      isUserLoading,
      isConfigured: isSupabaseConfigured(),
    }),
    [supabase, user, session, isUserLoading]
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
