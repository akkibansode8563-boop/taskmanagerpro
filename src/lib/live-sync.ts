'use client';

import type { Meeting, Task } from '@/lib/types';

type TaskMutationEvent =
  | { type: 'created' | 'updated'; task: Task }
  | { type: 'deleted'; taskId: string };

type MeetingMutationEvent =
  | { type: 'created' | 'updated'; meeting: Meeting }
  | { type: 'deleted'; meetingId: string };

const taskEventName = 'taskmaster:tasks';
const meetingEventName = 'taskmaster:meetings';

export function emitTaskMutation(event: TaskMutationEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<TaskMutationEvent>(taskEventName, { detail: event }));
}

export function emitMeetingMutation(event: MeetingMutationEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MeetingMutationEvent>(meetingEventName, { detail: event }));
}

export function subscribeToTaskMutations(callback: (event: TaskMutationEvent) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    callback((event as CustomEvent<TaskMutationEvent>).detail);
  };

  window.addEventListener(taskEventName, handler);
  return () => window.removeEventListener(taskEventName, handler);
}

export function subscribeToMeetingMutations(callback: (event: MeetingMutationEvent) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    callback((event as CustomEvent<MeetingMutationEvent>).detail);
  };

  window.addEventListener(meetingEventName, handler);
  return () => window.removeEventListener(meetingEventName, handler);
}
