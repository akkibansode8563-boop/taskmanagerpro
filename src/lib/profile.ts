import type { User } from '@supabase/supabase-js';
import type { ProfileRow } from '@/lib/database';

export function getDisplayName(user: User | null, profile?: ProfileRow | null) {
  return (
    profile?.display_name?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'User'
  );
}
