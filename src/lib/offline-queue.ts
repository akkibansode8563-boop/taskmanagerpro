'use client';

import { getSupabaseBrowserClient } from '@/supabase/client';
import type { Task, Meeting } from './types';

export interface QueueItem {
  id: string;
  timestamp: number;
  type: 'task' | 'meeting';
  action: 'create' | 'update' | 'delete' | 'update-minutes';
  payload: any;
}

const QUEUE_KEY = 'taskmaster:offline_queue';
const TASKS_CACHE_KEY = 'taskmaster:cached_tasks';
const MEETINGS_CACHE_KEY = 'taskmaster:cached_meetings';

// Helpers to read/write local storage safely
export function getOfflineQueue(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to read offline queue:', e);
    return [];
  }
}

export function saveOfflineQueue(queue: QueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue:', e);
  }
}

export function cacheTasksLocally(tasks: Task[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to cache tasks:', e);
  }
}

export function getCachedTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TASKS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load cached tasks:', e);
    return [];
  }
}

export function cacheMeetingsLocally(meetings: Meeting[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEETINGS_CACHE_KEY, JSON.stringify(meetings));
  } catch (e) {
    console.error('Failed to cache meetings:', e);
  }
}

export function getCachedMeetings(): Meeting[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(MEETINGS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load cached meetings:', e);
    return [];
  }
}

// Add an item to the offline queue
export function enqueueOperation(
  type: 'task' | 'meeting',
  action: 'create' | 'update' | 'delete' | 'update-minutes',
  payload: any
) {
  const queue = getOfflineQueue();
  const newItem: QueueItem = {
    id: globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type,
    action,
    payload,
  };
  queue.push(newItem);
  saveOfflineQueue(queue);

  // Trigger sync process in background if online (failsafe)
  if (navigator.onLine) {
    syncOfflineQueue();
  }
}

// Synchronize all pending local mutations with Supabase
let isSyncing = false;

export async function syncOfflineQueue() {
  if (isSyncing || typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`[OfflineQueue] Starting sync for ${queue.length} items...`);
  const supabase = getSupabaseBrowserClient();

  const remainingQueue: QueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'task') {
        const { payload, action } = item;
        if (action === 'create') {
          await supabase.from('tasks').upsert({
            id: payload.id,
            user_id: payload.userId,
            name: payload.name,
            details: payload.details,
            category: payload.category,
            due_at: payload.dueDate,
            reminder_at: payload.reminderTime,
            priority: payload.priority,
            status: payload.status,
            was_carried_forward: payload.wasCarriedForward,
          });
        } else if (action === 'update') {
          await supabase
            .from('tasks')
            .update({
              name: payload.name,
              details: payload.details,
              category: payload.category,
              due_at: payload.dueDate,
              reminder_at: payload.reminderTime,
              priority: payload.priority,
              status: payload.status,
              was_carried_forward: payload.wasCarriedForward,
            })
            .eq('id', payload.id);
        } else if (action === 'delete') {
          await supabase.from('tasks').delete().eq('id', payload.taskId);
        }
      } else if (item.type === 'meeting') {
        const { payload, action } = item;
        if (action === 'create') {
          await supabase.from('meetings').upsert({
            id: payload.id,
            user_id: payload.userId,
            title: payload.title,
            subtitle: payload.subtitle,
            location: payload.location,
            attendees: payload.attendees,
            scheduled_at: payload.dateTime,
            status: payload.status,
            minutes: payload.minutes,
          });
        } else if (action === 'update') {
          await supabase
            .from('meetings')
            .update({
              title: payload.title,
              subtitle: payload.subtitle,
              location: payload.location,
              attendees: payload.attendees,
              scheduled_at: payload.dateTime,
              status: payload.status,
              minutes: payload.minutes,
            })
            .eq('id', payload.id);
        } else if (action === 'delete') {
          await supabase.from('meetings').delete().eq('id', payload.meetingId);
        } else if (action === 'update-minutes') {
          await supabase
            .from('meetings')
            .update({ minutes: payload.minutes, status: 'COMPLETED' })
            .eq('id', payload.meetingId);
        }
      }
    } catch (err) {
      console.error(`[OfflineQueue] Error syncing item ${item.id}:`, err);
      // Keep it in the queue to retry next time
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);
  isSyncing = false;

  // Dispatch a global custom event to notify components that sync finished
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('taskmaster:sync_complete'));
  }
}

// Register global listeners for online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineQueue] Network is online. Flushing queue...');
    syncOfflineQueue();
  });
}
