import { describe, expect, it } from 'vitest';
import type { TaskRow, MeetingRow } from '@/lib/database';
import type { Task, Meeting } from '@/lib/types';
import {
  calculateSnoozeDate,
  getReminderDedupeKey,
  mergeMeetingPayload,
  mergeTaskPayload,
} from './sync-logic';

describe('sync-logic', () => {
  const sampleTask: Task = {
    id: 'task-1',
    name: 'Prepare quarterly review',
    details: 'Review financial metrics and KPIs',
    category: 'Finance',
    dueDate: '2026-11-10T10:00:00Z',
    reminderTime: '2026-11-10T09:00:00Z',
    priority: 'HIGH',
    status: 'TODO',
    isCompleted: false,
    wasCarriedForward: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const sampleMeeting: Meeting = {
    id: 'meeting-1',
    title: 'Board Meeting',
    subtitle: 'Q4 Strategy',
    location: 'Conference Room A',
    attendees: 'Alice, Bob',
    dateTime: '2026-11-12T14:00:00Z',
    status: 'SCHEDULED',
    isCompleted: false,
    minutes: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  describe('mergeTaskPayload', () => {
    it('applies INSERT payload for a new task', () => {
      const newRow: TaskRow = {
        id: 'task-2',
        user_id: 'user-1',
        name: 'New task from mobile',
        details: null,
        category: null,
        due_at: '2026-11-11T12:00:00Z',
        reminder_at: null,
        priority: 'MEDIUM',
        status: 'TODO',
        was_carried_forward: false,
        created_at: new Date(1700000050000).toISOString(),
        updated_at: new Date(1700000050000).toISOString(),
      };

      const result = mergeTaskPayload([sampleTask], {
        eventType: 'INSERT',
        new: newRow,
      });

      expect(result.action).toBe('inserted');
      expect(result.tasks.length).toBe(2);
      expect(result.changedTask?.id).toBe('task-2');
      expect(result.tasks[0].name).toBe('New task from mobile');
    });

    it('applies UPDATE payload when incoming updatedAt is newer', () => {
      const updatedRow: TaskRow = {
        id: 'task-1',
        user_id: 'user-1',
        name: 'Updated title from tablet',
        details: 'Review financial metrics and KPIs',
        category: 'Finance',
        due_at: '2026-11-10T10:00:00Z',
        reminder_at: '2026-11-10T09:00:00Z',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        was_carried_forward: false,
        created_at: new Date(1700000000000).toISOString(),
        updated_at: new Date(1700000100000).toISOString(), // Newer
      };

      const result = mergeTaskPayload([sampleTask], {
        eventType: 'UPDATE',
        new: updatedRow,
      });

      expect(result.action).toBe('updated');
      expect(result.tasks.length).toBe(1);
      expect(result.changedTask?.name).toBe('Updated title from tablet');
      expect(result.changedTask?.status).toBe('IN_PROGRESS');
      expect(result.tasks[0].updatedAt).toBe(1700000100000);
    });

    it('rejects stale UPDATE payloads with older or equal updatedAt (stale-update rejection)', () => {
      const staleRow: TaskRow = {
        id: 'task-1',
        user_id: 'user-1',
        name: 'Stale title that arrived late',
        details: 'Old details',
        category: 'Finance',
        due_at: '2026-11-10T10:00:00Z',
        reminder_at: null,
        priority: 'LOW',
        status: 'TODO',
        was_carried_forward: false,
        created_at: new Date(1699999000000).toISOString(),
        updated_at: new Date(1699999000000).toISOString(), // Older than sampleTask.updatedAt (1700000000000)
      };

      const result = mergeTaskPayload([sampleTask], {
        eventType: 'UPDATE',
        new: staleRow,
      });

      expect(result.action).toBe('ignored');
      expect(result.changedTask).toBeNull();
      expect(result.tasks[0].name).toBe('Prepare quarterly review');
      expect(result.tasks[0].updatedAt).toBe(1700000000000);
    });

    it('rejects identical timestamp updates to prevent local echo loop', () => {
      const identicalRow: TaskRow = {
        id: 'task-1',
        user_id: 'user-1',
        name: 'Echo payload',
        details: null,
        category: null,
        due_at: '2026-11-10T10:00:00Z',
        reminder_at: null,
        priority: 'HIGH',
        status: 'TODO',
        was_carried_forward: false,
        created_at: new Date(1700000000000).toISOString(),
        updated_at: new Date(1700000000000).toISOString(), // Equal
      };

      const result = mergeTaskPayload([sampleTask], {
        eventType: 'UPDATE',
        new: identicalRow,
      });

      expect(result.action).toBe('ignored');
      expect(result.changedTask).toBeNull();
    });

    it('applies DELETE payload and removes item from local state', () => {
      const result = mergeTaskPayload([sampleTask], {
        eventType: 'DELETE',
        old: { id: 'task-1' },
      });

      expect(result.action).toBe('deleted');
      expect(result.tasks.length).toBe(0);
      expect(result.changedTask?.id).toBe('task-1');
    });

    it('ignores DELETE payload if target id is not found', () => {
      const result = mergeTaskPayload([sampleTask], {
        eventType: 'DELETE',
        old: { id: 'non-existent-task' },
      });

      expect(result.action).toBe('ignored');
      expect(result.tasks.length).toBe(1);
    });
  });

  describe('mergeMeetingPayload', () => {
    it('applies INSERT payload for meetings', () => {
      const newMeetingRow: MeetingRow = {
        id: 'meeting-2',
        user_id: 'user-1',
        title: 'Sprint Planning',
        subtitle: null,
        location: 'Zoom',
        attendees: null,
        scheduled_at: '2026-11-13T10:00:00Z',
        status: 'SCHEDULED',
        minutes: null,
        created_at: new Date(1700000050000).toISOString(),
        updated_at: new Date(1700000050000).toISOString(),
      };

      const result = mergeMeetingPayload([sampleMeeting], {
        eventType: 'INSERT',
        new: newMeetingRow,
      });

      expect(result.action).toBe('inserted');
      expect(result.meetings.length).toBe(2);
      expect(result.changedMeeting?.id).toBe('meeting-2');
    });

    it('rejects stale meeting updates', () => {
      const staleMeetingRow: MeetingRow = {
        id: 'meeting-1',
        user_id: 'user-1',
        title: 'Stale Meeting',
        subtitle: null,
        location: null,
        attendees: null,
        scheduled_at: '2026-11-12T14:00:00Z',
        status: 'CANCELLED',
        minutes: null,
        created_at: new Date(1699999000000).toISOString(),
        updated_at: new Date(1699999000000).toISOString(),
      };

      const result = mergeMeetingPayload([sampleMeeting], {
        eventType: 'UPDATE',
        new: staleMeetingRow,
      });

      expect(result.action).toBe('ignored');
      expect(result.meetings[0].title).toBe('Board Meeting');
    });

    it('applies meeting DELETE payload', () => {
      const result = mergeMeetingPayload([sampleMeeting], {
        eventType: 'DELETE',
        old: { id: 'meeting-1' },
      });

      expect(result.action).toBe('deleted');
      expect(result.meetings.length).toBe(0);
    });
  });

  describe('getReminderDedupeKey', () => {
    it('generates consistent deterministic key for given taskId and date', () => {
      const dateStr = '2026-11-10T09:00:00.000Z';
      const key1 = getReminderDedupeKey('task-123', dateStr);
      const key2 = getReminderDedupeKey('task-123', new Date(dateStr));
      const key3 = getReminderDedupeKey('task-123', new Date(dateStr).getTime());

      expect(key1).toBe('task-task-123-2026-11-10T09:00:00.000Z');
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('handles null and undefined reminder times safely', () => {
      expect(getReminderDedupeKey('task-123', null)).toBe('task-task-123-none');
      expect(getReminderDedupeKey('task-123', undefined)).toBe('task-task-123-none');
    });
  });

  describe('calculateSnoozeDate', () => {
    const fixedNow = 1700000000000;

    it('accurately computes 5 minute snooze from now', () => {
      const nextDate = calculateSnoozeDate(fixedNow, 5, fixedNow);
      const expected = new Date(fixedNow + 5 * 60 * 1000).toISOString();
      expect(nextDate).toBe(expected);
    });

    it('accurately computes 15 minute snooze from now', () => {
      const nextDate = calculateSnoozeDate(fixedNow, 15, fixedNow);
      const expected = new Date(fixedNow + 15 * 60 * 1000).toISOString();
      expect(nextDate).toBe(expected);
    });

    it('accurately computes 60 minute snooze from now', () => {
      const nextDate = calculateSnoozeDate(fixedNow, 60, fixedNow);
      const expected = new Date(fixedNow + 60 * 60 * 1000).toISOString();
      expect(nextDate).toBe(expected);
    });

    it('falls back to nowMs if baseDate is in the past', () => {
      const pastDate = fixedNow - 3600000; // 1 hour ago
      const nextDate = calculateSnoozeDate(pastDate, 10, fixedNow);
      const expected = new Date(fixedNow + 10 * 60 * 1000).toISOString();
      expect(nextDate).toBe(expected);
    });

    it('handles null baseDate safely', () => {
      const nextDate = calculateSnoozeDate(null, 5, fixedNow);
      const expected = new Date(fixedNow + 5 * 60 * 1000).toISOString();
      expect(nextDate).toBe(expected);
    });
  });
});
