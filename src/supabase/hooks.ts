'use client';

import { useEffect, useState } from 'react';
import { subscribeToMeetingMutations, subscribeToTaskMutations } from '@/lib/live-sync';
import { mapMeetingRowToMeeting, mapTaskRowToTask, type MeetingRow, type ProfileRow, type TaskRow } from '@/lib/database';
import type { Meeting, Task } from '@/lib/types';
import { useSupabase } from '@/supabase/provider';

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
      setIsLoading(true);
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
      setIsLoading(false);
    };

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
        setData(sortTasks((rows as TaskRow[]).map(mapTaskRowToTask), sort));
      }
      setIsLoading(false);
    };

    fetchTasks();

    const channel = supabase
      .channel(`tasks-${user.id}-${sort}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, fetchTasks)
      .subscribe();

    const unsubscribe = subscribeToTaskMutations((event) => {
      setData((current) => {
        const existing = current ?? [];

        if (event.type === 'deleted') {
          return existing.filter((task) => task.id !== event.taskId);
        }

        const nextTasks = existing.some((task) => task.id === event.task.id)
          ? existing.map((task) => (task.id === event.task.id ? event.task : task))
          : [event.task, ...existing];

        return sortTasks(nextTasks, sort);
      });
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      unsubscribe();
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
        setData(sortMeetings((rows as MeetingRow[]).map(mapMeetingRowToMeeting), sort));
      }
      setIsLoading(false);
    };

    fetchMeetings();

    const channel = supabase
      .channel(`meetings-${user.id}-${sort}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings', filter: `user_id=eq.${user.id}` }, fetchMeetings)
      .subscribe();

    const unsubscribe = subscribeToMeetingMutations((event) => {
      setData((current) => {
        const existing = current ?? [];

        if (event.type === 'deleted') {
          return existing.filter((meeting) => meeting.id !== event.meetingId);
        }

        const nextMeetings = existing.some((meeting) => meeting.id === event.meeting.id)
          ? existing.map((meeting) => (meeting.id === event.meeting.id ? event.meeting : meeting))
          : [event.meeting, ...existing];

        return sortMeetings(nextMeetings, sort);
      });
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      unsubscribe();
    };
  }, [isConfigured, sort, supabase, user]);

  return { data, isLoading };
}
