import type { Meeting, MeetingStatus, Task, TaskStatus } from '@/lib/types';

export function normalizeTask(task: Task): Task & { status: TaskStatus } {
  return {
    ...task,
    status: task.status ?? (task.isCompleted ? 'COMPLETED' : 'TODO'),
    isCompleted: task.status ? task.status === 'COMPLETED' : Boolean(task.isCompleted),
    category: task.category ?? null,
  };
}

export function normalizeMeeting(meeting: Meeting): Meeting & { status: MeetingStatus } {
  return {
    ...meeting,
    status: meeting.status ?? (meeting.isCompleted ? 'COMPLETED' : 'SCHEDULED'),
    isCompleted: meeting.status ? meeting.status === 'COMPLETED' : Boolean(meeting.isCompleted),
    location: meeting.location ?? null,
    attendees: meeting.attendees ?? null,
  };
}

export function isTaskDone(task: Task) {
  return normalizeTask(task).status === 'COMPLETED';
}

export function isMeetingDone(meeting: Meeting) {
  return normalizeMeeting(meeting).status === 'COMPLETED';
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
};

export const meetingStatusLabel: Record<MeetingStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
