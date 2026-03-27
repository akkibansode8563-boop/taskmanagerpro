'use client';

import { useEffect, useState } from 'react';
import { mapMeetingRowToMeeting, mapTaskRowToTask, type MeetingRow, type TaskRow } from '@/lib/database';
import type { Meeting, Task } from '@/lib/types';
import { useSupabase } from '@/supabase/provider';

type TaskSort = 'updated' | 'due';
type MeetingSort = 'updated' | 'scheduled';

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

    const fetchTasks = async () => {
      setIsLoading(true);
      const orderColumn = sort === 'due' ? 'due_at' : 'updated_at';
      const ascending = sort === 'due';
      const { data: rows, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order(orderColumn, { ascending });

      if (!isMounted) return;

      if (error) {
        setData([]);
      } else {
        setData((rows as TaskRow[]).map(mapTaskRowToTask));
      }
      setIsLoading(false);
    };

    fetchTasks();

    const channel = supabase
      .channel(`tasks-${user.id}-${sort}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, fetchTasks)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
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

    const fetchMeetings = async () => {
      setIsLoading(true);
      const orderColumn = sort === 'scheduled' ? 'scheduled_at' : 'updated_at';
      const ascending = sort === 'scheduled';
      const { data: rows, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', user.id)
        .order(orderColumn, { ascending });

      if (!isMounted) return;

      if (error) {
        setData([]);
      } else {
        setData((rows as MeetingRow[]).map(mapMeetingRowToMeeting));
      }
      setIsLoading(false);
    };

    fetchMeetings();

    const channel = supabase
      .channel(`meetings-${user.id}-${sort}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings', filter: `user_id=eq.${user.id}` }, fetchMeetings)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isConfigured, sort, supabase, user]);

  return { data, isLoading };
}
