export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type Task = {
  id: string;
  name: string;
  details: string | null;
  dueDate: string;
  reminderTime: string | null;
  priority: TaskPriority;
  status?: TaskStatus;
  category?: string | null;
  isCompleted?: boolean;
  wasCarriedForward: boolean;
  updatedAt: number;
  createdAt?: number;
};

export type Meeting = {
  id: string;
  title: string;
  subtitle: string | null;
  dateTime: string;
  status?: MeetingStatus;
  location?: string | null;
  attendees?: string | null;
  isCompleted?: boolean;
  minutes?: string | null;
  updatedAt: number;
  createdAt?: number;
};

export type TaskFilter = 'all' | 'pending' | 'completed';
export type MeetingFilter = 'all' | 'pending' | 'completed';
