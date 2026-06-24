import { describe, it, expect } from 'vitest';
import { normalizeTask, normalizeMeeting, isTaskDone, isMeetingDone } from './workflow';
import type { Task, Meeting } from './types';

describe('normalizeTask', () => {
  it('should fill status from isCompleted if status is missing', () => {
    const task = {
      id: '1',
      name: 'Test Task',
      isCompleted: true,
    } as unknown as Task;

    const normalized = normalizeTask(task);
    expect(normalized.status).toBe('COMPLETED');
  });

  it('should calculate isCompleted correctly based on status', () => {
    const task = {
      id: '2',
      name: 'Test Task 2',
      status: 'IN_PROGRESS',
      isCompleted: false,
    } as Task;

    const normalized = normalizeTask(task);
    expect(normalized.isCompleted).toBe(false);
  });
});

describe('normalizeMeeting', () => {
  it('should correctly normalize location and attendees to null if undefined', () => {
    const meeting = {
      id: 'm1',
      title: 'Board Meeting',
      status: 'SCHEDULED',
    } as unknown as Meeting;

    const normalized = normalizeMeeting(meeting);
    expect(normalized.location).toBeNull();
    expect(normalized.attendees).toBeNull();
  });
});

describe('Done checkers', () => {
  it('should detect if task or meeting is completed', () => {
    const taskDone = { status: 'COMPLETED' } as Task;
    const taskPending = { status: 'TODO' } as Task;
    const meetingDone = { status: 'COMPLETED' } as Meeting;
    const meetingPending = { status: 'SCHEDULED' } as Meeting;

    expect(isTaskDone(taskDone)).toBe(true);
    expect(isTaskDone(taskPending)).toBe(false);
    expect(isMeetingDone(meetingDone)).toBe(true);
    expect(isMeetingDone(meetingPending)).toBe(false);
  });
});
