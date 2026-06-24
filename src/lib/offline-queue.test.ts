import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getOfflineQueue, 
  saveOfflineQueue, 
  cacheTasksLocally, 
  getCachedTasks, 
  enqueueOperation,
  QueueItem
} from './offline-queue';
import type { Task } from './types';

describe('offline-queue storage managers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return empty queue initially', () => {
    expect(getOfflineQueue()).toEqual([]);
  });

  it('should save and load queue items correctly', () => {
    const mockItems: QueueItem[] = [
      {
        id: 'q1',
        timestamp: Date.now(),
        type: 'task',
        action: 'create',
        payload: { id: 't1', name: 'Task 1' }
      }
    ];

    saveOfflineQueue(mockItems);
    expect(getOfflineQueue()).toEqual(mockItems);
  });

  it('should store and retrieve cached tasks', () => {
    const mockTasks: Task[] = [
      {
        id: 't1',
        name: 'Task 1',
        details: null,
        reminderTime: null,
        dueDate: '2026-06-24',
        priority: 'MEDIUM',
        status: 'TODO',
        isCompleted: false,
        wasCarriedForward: false,
        createdAt: 1000,
        updatedAt: 2000
      }
    ];

    cacheTasksLocally(mockTasks);
    expect(getCachedTasks()).toEqual(mockTasks);
  });

  it('should append items using enqueueOperation', () => {
    enqueueOperation('task', 'delete', { taskId: 't5' });
    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].action).toBe('delete');
    expect(queue[0].payload).toEqual({ taskId: 't5' });
  });
});
