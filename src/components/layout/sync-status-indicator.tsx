'use client';

import React from 'react';
import { useRealtime } from '@/supabase';
import { cn } from '@/lib/utils';

export function SyncStatusIndicator() {
  const { connectionStatus, refetchTasks, refetchMeetings } = useRealtime();

  const handleManualSync = () => {
    refetchTasks(false);
    refetchMeetings(false);
  };

  return (
    <button
      type="button"
      onClick={handleManualSync}
      title={`Realtime Status: ${connectionStatus}. Click to refresh.`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer',
        connectionStatus === 'Live' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        connectionStatus === 'Reconnecting' && 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        connectionStatus === 'Offline' && 'border-muted-foreground/30 bg-muted/40 text-muted-foreground'
      )}
      aria-label={`Realtime sync status: ${connectionStatus}`}
    >
      <span className="relative flex h-2 w-2">
        {connectionStatus === 'Live' && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </>
        )}
        {connectionStatus === 'Reconnecting' && (
          <span className="relative inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        )}
        {connectionStatus === 'Offline' && (
          <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground/60" />
        )}
      </span>

      <span className="text-[11px] font-semibold tracking-tight">
        {connectionStatus === 'Live' ? 'Live' : connectionStatus === 'Reconnecting' ? 'Reconnecting' : 'Offline'}
      </span>
    </button>
  );
}
