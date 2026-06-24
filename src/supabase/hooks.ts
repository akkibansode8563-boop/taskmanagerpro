'use client';

import { useEffect, useState } from 'react';
import { subscribeToMeetingMutations, subscribeToTaskMutations } from '@/lib/live-sync';
import { mapMeetingRowToMeeting, mapTaskRowToTask, type MeetingRow, type ProfileRow, type TaskRow } from '@/lib/database';
import type { Meeting, Task } from '@/lib/types';
import { useSupabase } from '@/supabase/provider';
import { 
  cacheTasksLocally, 
  getCachedTasks, 
  cacheMeetingsLocally, 
  getCachedMeetings 
} from '@/lib/offline-queue';

type TaskSort = 'updated' | 'due';
type MeetingSort = 'updated' | 'scheduled';

function sortTasks(tasks: Task[], sort: TaskSort) {
  const orderColumn = sort === 'due' ? 'dueDate' : 'updatedAt';
  const ascending = sort === 'due';

  return [...tasks].sort((left, right) => {
    const leftValue = orderColumn === 'dueDate' ? new Date(left.dueDate).getTime() : left.updatedAt;
    const rightValue = orderColumn === 'dueDate' ? new Date(right.dueDate).getTime() : right.updatedAt;
    return ascending ? leftValue - rightValue : rightValue - leftValue;
  });
}

function sortMeetings(meetings: Meeting[], sort: MeetingSort) {
  const orderColumn = sort === 'scheduled' ? 'dateTime' : 'updatedAt';
  const ascending = sort === 'scheduled';

  return [...meetings].sort((left, right) => {
    const leftValue = orderColumn === 'dateTime' ? new Date(left.dateTime).getTime() : left.updatedAt;
    const rightValue = orderColumn === 'dateTime' ? new Date(right.dateTime).getTime() : right.updatedAt;
    return ascending ? leftValue - rightValue : rightValue - leftValue;
  });
}

export function useProfile() {
  const { supabase, user, isConfigured } = useSupabase();
  const [data, setData] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isConfigured) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const { data: row, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          setData(null);
        } else {
          setData((row as ProfileRow | null) ?? null);
        }
      } catch (err) {
        console.error('[useProfile] fetchProfile error:', err);
        if (isMounted) {
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    fetchProfile();

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, fetchProfile)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isConfigured, supabase, user]);

  return { data, isLoading };
}

export function useTasks(sort: TaskSort = 'updated') {
  const { supabase, user, isConfigured } = useSupabase();
  const [data, setData] = useState<Task[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isConfigured) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTasks = async (showSkeleton = false) => {
      if (showSkeleton) {
        setIsLoading(true);
      }
      try {
        const orderColumn = sort === 'due' ? 'due_at' : 'updated_at';
        const ascending = sort === 'due';
        
        // If offline, bypass network call immediately
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const cached = getCachedTasks();
          if (isMounted) {
            setData(sortTasks(cached, sort));
            setIsLoading(false);
          }
          return;
        }

        const { data: rows, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order(orderColumn, { ascending });

        if (!isMounted) return;

        if (error || !rows) {
          const cached = getCachedTasks();
          setData(sortTasks(cached, sort));
        } else {
          const tasks = sortTasks((rows as TaskRow[]).map(mapTaskRowToTask), sort);
          setData(tasks);
          cacheTasksLocally(tasks);
        }
      } catch (err) {
        console.error('[useTasks] fetchTasks error:', err);
        if (isMounted) {
          const cached = getCachedTasks();
          setData(sortTasks(cached, sort));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTasks(true);

    const channel = supabase
      .channel(`tasks-${user.id}-${sort}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => fetchTasks(false))
      .subscribe();

    const unsubscribe = subscribeToTaskMutations((event) => {
      setData((current) => {
        const existing = current ?? [];

        if (event.type === 'deleted') {
          const next = existing.filter((task) => task.id !== event.taskId);
          cacheTasksLocally(next);
          return next;
        }

        const nextTasks = existing.some((task) => task.id === event.task.id)
          ? existing.map((task) => (task.id === event.task.id ? event.task : task))
          : [event.task, ...existing];

        const sorted = sortTasks(nextTasks, sort);
        cacheTasksLocally(sorted);
        return sorted;
      });
    });

    const handleSyncComplete = () => {
      fetchTasks(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('taskmaster:sync_complete', handleSyncComplete);
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('taskmaster:sync_complete', handleSyncComplete);
      }
    };
  }, [isConfigured, sort, supabase, user]);

  return { data, isLoading };
}

export function useMeetings(sort: MeetingSort = 'updated') {
  const { supabase, user, isConfigured } = useSupabase();
  const [data, setData] = useState<Meeting[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isConfigured) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMeetings = async (showSkeleton = false) => {
      if (showSkeleton) {
        setIsLoading(true);
      }
      try {
        const orderColumn = sort === 'scheduled' ? 'scheduled_at' : 'updated_at';
        const ascending = sort === 'scheduled';

        // If offline, bypass network call immediately
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const cached = getCachedMeetings();
          if (isMounted) {
            setData(sortMeetings(cached, sort));
            setIsLoading(false);
          }
          return;
        }

        const { data: rows, error } = await supabase
          .from('meetings')
          .select('*')
          .eq('user_id', user.id)
          .order(orderColumn, { ascending });

        if (!isMounted) return;

        if (error || !rows) {
          const cached = getCachedMeetings();
          setData(sortMeetings(cached, sort));
        } else {
          const meetings = sortMeetings((rows as MeetingRow[]).map(mapMeetingRowToMeeting), sort);
          setData(meetings);
          cacheMeetingsLocally(meetings);
        }
      } catch (err) {
        console.error('[useMeetings] fetchMeetings error:', err);
        if (isMounted) {
          const cached = getCachedMeetings();
          setData(sortMeetings(cached, sort));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMeetings(true);

    const channel = supabase
      .channel(`meetings-${user.id}-${sort}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings', filter: `user_id=eq.${user.id}` }, () => fetchMeetings(false))
      .subscribe();

    const unsubscribe = subscribeToMeetingMutations((event) => {
      setData((current) => {
        const existing = current ?? [];

        if (event.type === 'deleted') {
          const next = existing.filter((meeting) => meeting.id !== event.meetingId);
          cacheMeetingsLocally(next);
          return next;
        }

        const nextMeetings = existing.some((meeting) => meeting.id === event.meeting.id)
          ? existing.map((meeting) => (meeting.id === event.meeting.id ? event.meeting : meeting))
          : [event.meeting, ...existing];

        const sorted = sortMeetings(nextMeetings, sort);
        cacheMeetingsLocally(sorted);
        return sorted;
      });
    });

    const handleSyncComplete = () => {
      fetchMeetings(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('taskmaster:sync_complete', handleSyncComplete);
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('taskmaster:sync_complete', handleSyncComplete);
      }
    };
  }, [isConfigured, sort, supabase, user]);

  return { data, isLoading };
}
