'use client';

import type { User } from '@supabase/supabase-js';
import { cancelTaskReminder, scheduleTaskReminder } from '@/lib/mobile-reminders';
import { emitMeetingMutation, emitTaskMutation } from '@/lib/live-sync';
import { normalizeMeeting, normalizeTask } from '@/lib/workflow';
import type { Meeting, MeetingStatus, Task, TaskPriority, TaskStatus } from '@/lib/types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/supabase/client';
import { enqueueOperation } from '@/lib/offline-queue';

const supabase = getSupabaseBrowserClient();

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `tmp-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function isNetworkOrConfigError(error: unknown): boolean {
  if (!isSupabaseConfigured()) return true;
  if (typeof window !== 'undefined' && !navigator.onLine) return true;
  if (!error) return false;
  const msg = ((error as { message?: string })?.message || String(error)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('abort') ||
    msg.includes('load failed') ||
    msg.includes('connection refused') ||
    msg.includes('placeholder')
  );
}

export async function ensureProfile(user: User, displayName?: string | null) {
  if (!isSupabaseConfigured() || (typeof window !== 'undefined' && !navigator.onLine)) {
    return;
  }
  try {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: displayName ?? user.user_metadata?.display_name ?? null,
      last_login_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[TaskMaster Pro] ensureProfile failed (safely ignored):', err);
  }
}

export async function createTaskRecord(
  user: User,
  data: {
    name: string;
    details: string | null;
    category: string | null;
    dueDate: string;
    reminderTime: string | null;
    priority: TaskPriority;
    status: TaskStatus;
  }
) {
  const id = createId();
  const createdTask: Task = {
    id,
    name: data.name,
    details: data.details,
    category: data.category,
    dueDate: data.dueDate,
    reminderTime: data.reminderTime,
    priority: data.priority,
    status: data.status,
    isCompleted: data.status === 'COMPLETED',
    wasCarriedForward: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('task', 'create', {
      userId: user.id,
      ...createdTask,
    });
  } else {
    try {
      const { error } = await supabase.from('tasks').insert({
        id,
        user_id: user.id,
        name: data.name,
        details: data.details,
        category: data.category,
        due_at: data.dueDate,
        reminder_at: data.reminderTime,
        priority: data.priority,
        status: data.status,
        was_carried_forward: false,
      });

      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase insert failed, saving to offline queue:', error);
          enqueueOperation('task', 'create', {
            userId: user.id,
            ...createdTask,
          });
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error adding task. Queuing for offline sync:', err);
        enqueueOperation('task', 'create', {
          userId: user.id,
          ...createdTask,
        });
      } else {
        throw err;
      }
    }
  }

  emitTaskMutation({ type: 'created', task: createdTask });
  await scheduleTaskReminder(createdTask);
  return createdTask;
}

export async function updateTaskRecord(task: Task, data: Partial<Task>) {
  const normalizedTask = normalizeTask({ ...task, ...data });
  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('task', 'update', normalizedTask);
  } else {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          name: normalizedTask.name,
          details: normalizedTask.details,
          category: normalizedTask.category ?? null,
          due_at: normalizedTask.dueDate,
          reminder_at: normalizedTask.reminderTime,
          priority: normalizedTask.priority,
          status: normalizedTask.status,
          was_carried_forward: normalizedTask.wasCarriedForward,
        })
        .eq('id', normalizedTask.id);

      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase update failed, saving to offline queue:', error);
          enqueueOperation('task', 'update', normalizedTask);
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error updating task. Queuing for offline sync:', err);
        enqueueOperation('task', 'update', normalizedTask);
      } else {
        throw err;
      }
    }
  }

  emitTaskMutation({ type: 'updated', task: normalizedTask });
  await scheduleTaskReminder(normalizedTask);
  return normalizedTask;
}

export async function deleteTaskRecord(taskId: string) {
  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('task', 'delete', { taskId });
  } else {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase delete failed, saving to offline queue:', error);
          enqueueOperation('task', 'delete', { taskId });
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error deleting task. Queuing for offline sync:', err);
        enqueueOperation('task', 'delete', { taskId });
      } else {
        throw err;
      }
    }
  }

  emitTaskMutation({ type: 'deleted', taskId });
  await cancelTaskReminder(taskId);
}

export async function createMeetingRecord(
  user: User,
  data: {
    title: string;
    subtitle: string | null;
    location: string | null;
    attendees: string | null;
    dateTime: string;
    status: MeetingStatus;
  }
) {
  const id = createId();
  const createdMeeting: Meeting = {
    id,
    title: data.title,
    subtitle: data.subtitle,
    location: data.location,
    attendees: data.attendees,
    dateTime: data.dateTime,
    status: data.status,
    isCompleted: data.status === 'COMPLETED',
    minutes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('meeting', 'create', {
      userId: user.id,
      ...createdMeeting,
    });
  } else {
    try {
      const { error } = await supabase.from('meetings').insert({
        id,
        user_id: user.id,
        title: data.title,
        subtitle: data.subtitle,
        location: data.location,
        attendees: data.attendees,
        scheduled_at: data.dateTime,
        status: data.status,
        minutes: null,
      });

      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase create meeting failed, saving to offline queue:', error);
          enqueueOperation('meeting', 'create', {
            userId: user.id,
            ...createdMeeting,
          });
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error creating meeting. Queuing for offline sync:', err);
        enqueueOperation('meeting', 'create', {
          userId: user.id,
          ...createdMeeting,
        });
      } else {
        throw err;
      }
    }
  }

  emitMeetingMutation({ type: 'created', meeting: createdMeeting });
  return createdMeeting;
}

export async function updateMeetingRecord(meeting: Meeting, data: Partial<Meeting>) {
  const normalizedMeeting = normalizeMeeting({ ...meeting, ...data });
  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('meeting', 'update', normalizedMeeting);
  } else {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          title: normalizedMeeting.title,
          subtitle: normalizedMeeting.subtitle,
          location: normalizedMeeting.location ?? null,
          attendees: normalizedMeeting.attendees ?? null,
          scheduled_at: normalizedMeeting.dateTime,
          status: normalizedMeeting.status,
          minutes: normalizedMeeting.minutes ?? null,
        })
        .eq('id', normalizedMeeting.id);

      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase update meeting failed, saving to offline queue:', error);
          enqueueOperation('meeting', 'update', normalizedMeeting);
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error updating meeting. Queuing for offline sync:', err);
        enqueueOperation('meeting', 'update', normalizedMeeting);
      } else {
        throw err;
      }
    }
  }

  emitMeetingMutation({ type: 'updated', meeting: normalizedMeeting });
  return normalizedMeeting;
}

export async function deleteMeetingRecord(meetingId: string) {
  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('meeting', 'delete', { meetingId });
  } else {
    try {
      const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase delete meeting failed, saving to offline queue:', error);
          enqueueOperation('meeting', 'delete', { meetingId });
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error deleting meeting. Queuing for offline sync:', err);
        enqueueOperation('meeting', 'delete', { meetingId });
      } else {
        throw err;
      }
    }
  }

  emitMeetingMutation({ type: 'deleted', meetingId });
}

export async function updateMeetingMinutes(meetingId: string, minutes: string) {
  const isConfigured = isSupabaseConfigured();
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  if (!isConfigured || isOffline) {
    enqueueOperation('meeting', 'update-minutes', { meetingId, minutes });
  } else {
    try {
      const { error } = await supabase.from('meetings').update({ minutes, status: 'COMPLETED' }).eq('id', meetingId);
      if (error) {
        if (isNetworkOrConfigError(error)) {
          console.warn('[TaskMaster Pro] Supabase update minutes failed, saving to offline queue:', error);
          enqueueOperation('meeting', 'update-minutes', { meetingId, minutes });
        } else {
          throw error;
        }
      }
    } catch (err) {
      if (isNetworkOrConfigError(err)) {
        console.warn('[TaskMaster Pro] Network error updating minutes. Queuing for offline sync:', err);
        enqueueOperation('meeting', 'update-minutes', { meetingId, minutes });
      } else {
        throw err;
      }
    }
  }
}
