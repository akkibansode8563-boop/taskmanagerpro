'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProfileRow } from '@/lib/database';
import type { Meeting, Task } from '@/lib/types';
import { useSupabase } from '@/supabase/provider';
import { useRealtime } from '@/supabase/realtime-provider';

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
  const { tasks, isTasksLoading } = useRealtime();

  const sortedTasks = useMemo(() => {
    return sortTasks(tasks, sort);
  }, [tasks, sort]);

  return { data: sortedTasks, isLoading: isTasksLoading };
}

export function useMeetings(sort: MeetingSort = 'updated') {
  const { meetings, isMeetingsLoading } = useRealtime();

  const sortedMeetings = useMemo(() => {
    return sortMeetings(meetings, sort);
  }, [meetings, sort]);

  return { data: sortedMeetings, isLoading: isMeetingsLoading };
}

