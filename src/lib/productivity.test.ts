import { describe, it, expect } from 'vitest';
import { getProductivityInsights } from './productivity';
import type { Task, Meeting } from './types';

describe('getProductivityInsights', () => {
  it('should return empty/zero insights when lists are empty', () => {
    const insights = getProductivityInsights([], []);
    
    expect(insights.pendingTasks).toBe(0);
    expect(insights.completedTasks).toBe(0);
    expect(insights.totalEvents).toBe(0);
    expect(insights.completionRate).toBe(0);
  });

  it('should correctly aggregate task metrics', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        name: 'Task 1',
        details: null,
        category: 'Work',
        dueDate: '2026-06-24T12:00:00.000Z',
        reminderTime: null,
        priority: 'HIGH',
        status: 'TODO',
        isCompleted: false,
        wasCarriedForward: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 't2',
        name: 'Task 2',
        details: null,
        category: 'Work',
        dueDate: '2026-06-24T12:00:00.000Z',
        reminderTime: null,
        priority: 'MEDIUM',
        status: 'COMPLETED',
        isCompleted: true,
        wasCarriedForward: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];

    const meetings: Meeting[] = [
      {
        id: 'm1',
        title: 'Meeting 1',
        subtitle: null,
        location: null,
        attendees: null,
        dateTime: '2026-06-24T14:00:00.000Z',
        status: 'SCHEDULED',
        isCompleted: false,
        minutes: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];

    // Anchor time to today (2026-06-24)
    const now = new Date('2026-06-24T10:00:00.000Z');
    const insights = getProductivityInsights(tasks, meetings, now);

    expect(insights.pendingTasks).toBe(1);
    expect(insights.completedTasks).toBe(1);
    expect(insights.pendingMeetings).toBe(1);
    expect(insights.totalEvents).toBe(3);
    // Completion rate should be (1 task completed + 0 meetings completed) / 3 total = 33%
    expect(insights.completionRate).toBe(33);
    expect(insights.priorityBreakdown.HIGH).toBe(1);
    expect(insights.priorityBreakdown.MEDIUM).toBe(0); // Only pending tasks count towards priority aggregation
  });
});
