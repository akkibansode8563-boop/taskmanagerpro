'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase } from '@/supabase/provider';
import type { Meeting, Task } from '@/lib/types';
import {
  mapMeetingRowToMeeting,
  mapTaskRowToTask,
  type MeetingRow,
  type TaskRow,
} from '@/lib/database';
import {
  cacheMeetingsLocally,
  cacheTasksLocally,
  getCachedMeetings,
  getCachedTasks,
} from '@/lib/offline-queue';
import {
  mergeMeetingPayload,
  mergeTaskPayload,
  type RealtimeChangeAction,
} from '@/lib/sync-logic';
import {
  subscribeToMeetingMutations,
  subscribeToTaskMutations,
} from '@/lib/live-sync';

export type SyncConnectionStatus = 'Live' | 'Reconnecting' | 'Offline';

export type RemoteChangeEvent<T> = {
  action: RealtimeChangeAction;
  item: T;
  source: 'realtime' | 'optimistic';
};

type RealtimeContextValue = {
  tasks: Task[];
  meetings: Meeting[];
  isTasksLoading: boolean;
  isMeetingsLoading: boolean;
  connectionStatus: SyncConnectionStatus;
  refetchTasks: (showSkeleton?: boolean) => Promise<void>;
  refetchMeetings: (showSkeleton?: boolean) => Promise<void>;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const remoteTaskChangeEventName = 'taskmaster:remote_task_alert';

export function emitRemoteTaskAlert(event: RemoteChangeEvent<Task>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<RemoteChangeEvent<Task>>(remoteTaskChangeEventName, { detail: event }));
}

export function subscribeToRemoteTaskAlert(callback: (event: RemoteChangeEvent<Task>) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    callback((event as CustomEvent<RemoteChangeEvent<Task>>).detail);
  };
  window.addEventListener(remoteTaskChangeEventName, handler);
  return () => window.removeEventListener(remoteTaskChangeEventName, handler);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { supabase, user, isConfigured } = useSupabase();

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      return getCachedTasks();
    }
    return [];
  });
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    if (typeof window !== 'undefined') {
      return getCachedMeetings();
    }
    return [];
  });

  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<SyncConnectionStatus>('Offline');
  const connectionStatusRef = useRef<SyncConnectionStatus>('Offline');
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffDelayRef = useRef<number>(1000);
  const isMountedRef = useRef<boolean>(true);

  // Keep a ref to latest tasks for payload merges without dependency thrashing
  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const meetingsRef = useRef<Meeting[]>(meetings);
  useEffect(() => {
    meetingsRef.current = meetings;
  }, [meetings]);

  const refetchTasks = useCallback(
    async (showSkeleton = false) => {
      if (!user || !isConfigured) return;

      if (showSkeleton) {
        setIsTasksLoading(true);
      }

      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = getCachedTasks();
        if (isMountedRef.current) {
          setTasks(cached);
          setIsTasksLoading(false);
        }
        return;
      }

      try {
        const { data: rows, error } = await supabase
          .from('tasks')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!isMountedRef.current) return;

        if (error || !rows) {
          const cached = getCachedTasks();
          setTasks(cached);
        } else {
          const mapped = (rows as TaskRow[]).map(mapTaskRowToTask);
          setTasks(mapped);
          cacheTasksLocally(mapped);
        }
      } catch (err) {
        console.error('[RealtimeProvider] refetchTasks error:', err);
        if (isMountedRef.current) {
          setTasks(getCachedTasks());
        }
      } finally {
        if (isMountedRef.current) {
          setIsTasksLoading(false);
        }
      }
    },
    [isConfigured, supabase, user]
  );

  const refetchMeetings = useCallback(
    async (showSkeleton = false) => {
      if (!user || !isConfigured) return;

      if (showSkeleton) {
        setIsMeetingsLoading(true);
      }

      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = getCachedMeetings();
        if (isMountedRef.current) {
          setMeetings(cached);
          setIsMeetingsLoading(false);
        }
        return;
      }

      try {
        const { data: rows, error } = await supabase
          .from('meetings')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!isMountedRef.current) return;

        if (error || !rows) {
          const cached = getCachedMeetings();
          setMeetings(cached);
        } else {
          const mapped = (rows as MeetingRow[]).map(mapMeetingRowToMeeting);
          setMeetings(mapped);
          cacheMeetingsLocally(mapped);
        }
      } catch (err) {
        console.error('[RealtimeProvider] refetchMeetings error:', err);
        if (isMountedRef.current) {
          setMeetings(getCachedMeetings());
        }
      } finally {
        if (isMountedRef.current) {
          setIsMeetingsLoading(false);
        }
      }
    },
    [isConfigured, supabase, user]
  );

  // Subscribe to optimistic mutations from offline-queue and local user edits
  useEffect(() => {
    const unsubTasks = subscribeToTaskMutations((event) => {
      setTasks((current) => {
        const existing = current ?? [];
        if (event.type === 'deleted') {
          const next = existing.filter((t) => t.id !== event.taskId);
          cacheTasksLocally(next);
          return next;
        }

        const next = existing.some((t) => t.id === event.task.id)
          ? existing.map((t) => (t.id === event.task.id ? event.task : t))
          : [event.task, ...existing];

        cacheTasksLocally(next);
        return next;
      });
    });

    const unsubMeetings = subscribeToMeetingMutations((event) => {
      setMeetings((current) => {
        const existing = current ?? [];
        if (event.type === 'deleted') {
          const next = existing.filter((m) => m.id !== event.meetingId);
          cacheMeetingsLocally(next);
          return next;
        }

        const next = existing.some((m) => m.id === event.meeting.id)
          ? existing.map((m) => (m.id === event.meeting.id ? event.meeting : m))
          : [event.meeting, ...existing];

        cacheMeetingsLocally(next);
        return next;
      });
    });

    const handleSyncComplete = () => {
      refetchTasks(false);
      refetchMeetings(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('taskmaster:sync_complete', handleSyncComplete);
    }

    return () => {
      unsubTasks();
      unsubMeetings();
      if (typeof window !== 'undefined') {
        window.removeEventListener('taskmaster:sync_complete', handleSyncComplete);
      }
    };
  }, [refetchMeetings, refetchTasks]);

  // Main Realtime Channel Setup
  useEffect(() => {
    isMountedRef.current = true;

    if (!user || !isConfigured) {
      setTasks([]);
      setMeetings([]);
      setIsTasksLoading(false);
      setIsMeetingsLoading(false);
      setConnectionStatus('Offline');
      return;
    }

    // Initial fetch
    refetchTasks(true);
    refetchMeetings(true);

    const subscribeChannel = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (typeof window !== 'undefined' && !navigator.onLine) {
        setConnectionStatus('Offline');
        return;
      }

      setConnectionStatus('Reconnecting');

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = `workspace-sync-${Date.now()}`;
      const channel = supabase.channel(channelName);

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          (payload) => {
            const result = mergeTaskPayload(tasksRef.current, {
              eventType: payload.eventType,
              new: payload.new as TaskRow,
              old: payload.old as Partial<TaskRow>,
            });

            if (result.action !== 'ignored') {
              setTasks(result.tasks);
              cacheTasksLocally(result.tasks);

              if (result.changedTask) {
                emitRemoteTaskAlert({
                  action: result.action,
                  item: result.changedTask,
                  source: 'realtime',
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meetings',
          },
          (payload) => {
            const result = mergeMeetingPayload(meetingsRef.current, {
              eventType: payload.eventType,
              new: payload.new as MeetingRow,
              old: payload.old as Partial<MeetingRow>,
            });

            if (result.action !== 'ignored') {
              setMeetings(result.meetings);
              cacheMeetingsLocally(result.meetings);
            }
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current) return;

          if (status === 'SUBSCRIBED') {
            setConnectionStatus('Live');
            backoffDelayRef.current = 1000; // Reset backoff on success
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[RealtimeProvider] Channel status ${status}:`, err);
            setConnectionStatus(
              typeof window !== 'undefined' && !navigator.onLine ? 'Offline' : 'Reconnecting'
            );

            // Schedule reconnect with exponential backoff
            const delay = backoffDelayRef.current;
            backoffDelayRef.current = Math.min(delay * 2, 30000);

            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                subscribeChannel();
                refetchTasks(false);
                refetchMeetings(false);
              }
            }, delay);
          }
        });

      channelRef.current = channel;
    };

    subscribeChannel();

    // Browser Online/Offline and Tab Visibility events
    const handleOnline = () => {
      setConnectionStatus('Reconnecting');
      backoffDelayRef.current = 1000;
      subscribeChannel();
      refetchTasks(false);
      refetchMeetings(false);
    };

    const handleOffline = () => {
      setConnectionStatus('Offline');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchTasks(false);
        refetchMeetings(false);
        // Verify channel is connected; if not, resubscribe
        if (connectionStatusRef.current !== 'Live') {
          subscribeChannel();
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConfigured, refetchMeetings, refetchTasks, supabase, user]);

  const value = useMemo(
    () => ({
      tasks,
      meetings,
      isTasksLoading,
      isMeetingsLoading,
      connectionStatus,
      refetchTasks,
      refetchMeetings,
    }),
    [tasks, meetings, isTasksLoading, isMeetingsLoading, connectionStatus, refetchTasks, refetchMeetings]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
