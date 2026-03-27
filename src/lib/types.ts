export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type Task = {
  id: string;
  name: string;
  details: string | null;
  dueDate: string;
  reminderTime: string | null;
  priority: TaskPriority;
  isCompleted: boolean;
  wasCarriedForward: boolean;
  updatedAt: number;
};

export type Meeting = {
  id: string;
  title: string;
  subtitle: string | null;
  dateTime: string;
  isCompleted: boolean;
  minutes?: string | null;
  updatedAt: number;
};

export type TaskFilter = 'all' | 'pending' | 'completed';
export type MeetingFilter = 'all' | 'pending' | 'completed';

    