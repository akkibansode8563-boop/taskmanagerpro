import { mapMeetingRowToMeeting, mapTaskRowToTask, type MeetingRow, type TaskRow } from '@/lib/database';
import type { Meeting, Task } from '@/lib/types';

export type RealtimeChangeAction = 'inserted' | 'updated' | 'deleted' | 'ignored';

export type TaskRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new?: TaskRow | null;
  old?: Partial<TaskRow> | null;
};

export type MeetingRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new?: MeetingRow | null;
  old?: Partial<MeetingRow> | null;
};

/**
 * Merges a Postgres Realtime change for tasks directly into local state
 * applying Last-Write-Wins (LWW) by updated_at and rejecting stale payloads.
 */
export function mergeTaskPayload(
  currentTasks: Task[],
  payload: TaskRealtimePayload
): { tasks: Task[]; changedTask: Task | null; action: RealtimeChangeAction } {
  if (payload.eventType === 'DELETE') {
    const targetId = payload.old?.id ?? payload.new?.id;
    if (!targetId) {
      return { tasks: currentTasks, changedTask: null, action: 'ignored' };
    }

    const existing = currentTasks.find((t) => t.id === targetId);
    if (!existing) {
      return { tasks: currentTasks, changedTask: null, action: 'ignored' };
    }

    return {
      tasks: currentTasks.filter((t) => t.id !== targetId),
      changedTask: existing,
      action: 'deleted',
    };
  }

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    if (!payload.new || !payload.new.id) {
      return { tasks: currentTasks, changedTask: null, action: 'ignored' };
    }

    const incomingTask = mapTaskRowToTask(payload.new);
    const existingIndex = currentTasks.findIndex((t) => t.id === incomingTask.id);

    if (existingIndex >= 0) {
      const existingTask = currentTasks[existingIndex];
      // Last-Write-Wins: if local state has equal or newer updatedAt, ignore stale update
      if (existingTask.updatedAt >= incomingTask.updatedAt) {
        return { tasks: currentTasks, changedTask: null, action: 'ignored' };
      }

      const nextTasks = [...currentTasks];
      nextTasks[existingIndex] = incomingTask;
      return { tasks: nextTasks, changedTask: incomingTask, action: 'updated' };
    }

    // New task insertion
    return {
      tasks: [incomingTask, ...currentTasks],
      changedTask: incomingTask,
      action: 'inserted',
    };
  }

  return { tasks: currentTasks, changedTask: null, action: 'ignored' };
}

/**
 * Merges a Postgres Realtime change for meetings directly into local state
 * applying Last-Write-Wins (LWW) by updated_at and rejecting stale payloads.
 */
export function mergeMeetingPayload(
  currentMeetings: Meeting[],
  payload: MeetingRealtimePayload
): { meetings: Meeting[]; changedMeeting: Meeting | null; action: RealtimeChangeAction } {
  if (payload.eventType === 'DELETE') {
    const targetId = payload.old?.id ?? payload.new?.id;
    if (!targetId) {
      return { meetings: currentMeetings, changedMeeting: null, action: 'ignored' };
    }

    const existing = currentMeetings.find((m) => m.id === targetId);
    if (!existing) {
      return { meetings: currentMeetings, changedMeeting: null, action: 'ignored' };
    }

    return {
      meetings: currentMeetings.filter((m) => m.id !== targetId),
      changedMeeting: existing,
      action: 'deleted',
    };
  }

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    if (!payload.new || !payload.new.id) {
      return { meetings: currentMeetings, changedMeeting: null, action: 'ignored' };
    }

    const incomingMeeting = mapMeetingRowToMeeting(payload.new);
    const existingIndex = currentMeetings.findIndex((m) => m.id === incomingMeeting.id);

    if (existingIndex >= 0) {
      const existingMeeting = currentMeetings[existingIndex];
      if (existingMeeting.updatedAt >= incomingMeeting.updatedAt) {
        return { meetings: currentMeetings, changedMeeting: null, action: 'ignored' };
      }

      const nextMeetings = [...currentMeetings];
      nextMeetings[existingIndex] = incomingMeeting;
      return { meetings: nextMeetings, changedMeeting: incomingMeeting, action: 'updated' };
    }

    return {
      meetings: [incomingMeeting, ...currentMeetings],
      changedMeeting: incomingMeeting,
      action: 'inserted',
    };
  }

  return { meetings: currentMeetings, changedMeeting: null, action: 'ignored' };
}

/**
 * Deterministic deduplication key for a reminder on a task.
 * Formatted as: task-{taskId}-{ISO string}
 */
export function getReminderDedupeKey(taskId: string, reminderAt: string | number | Date | null | undefined): string {
  if (!reminderAt) {
    return `task-${taskId}-none`;
  }
  const date = new Date(reminderAt);
  const timeStr = Number.isNaN(date.getTime()) ? String(reminderAt) : date.toISOString();
  return `task-${taskId}-${timeStr}`;
}

/**
 * Calculates a new ISO string for reminder_at when snoozed by N minutes.
 * If baseDate is in the past, snoozes relative to now.
 */
export function calculateSnoozeDate(baseDate: Date | number | string | null | undefined, minutes: number, nowMs = Date.now()): string {
  const parsed = baseDate ? new Date(baseDate).getTime() : NaN;
  const startMs = Number.isNaN(parsed) || parsed < nowMs ? nowMs : parsed;
  const snoozeMs = startMs + minutes * 60 * 1000;
  return new Date(snoozeMs).toISOString();
}
