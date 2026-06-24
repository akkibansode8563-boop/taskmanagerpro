import type { Meeting, MeetingStatus, Task, TaskPriority, TaskStatus } from '@/lib/types';

export type TaskRow = {
  id: string;
  user_id: string;
  name: string;
  details: string | null;
  category: string | null;
  due_at: string;
  reminder_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  was_carried_forward: boolean;
  created_at: string;
  updated_at: string;
};

export type MeetingRow = {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  location: string | null;
  attendees: string | null;
  scheduled_at: string;
  status: MeetingStatus;
  minutes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_login_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
      };
      tasks: {
        Row: TaskRow;
        Insert: Omit<TaskRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskRow, 'id' | 'user_id' | 'created_at'>>;
      };
      meetings: {
        Row: MeetingRow;
        Insert: Omit<MeetingRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MeetingRow, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
};

export function mapTaskRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    details: row.details,
    category: row.category,
    dueDate: row.due_at,
    reminderTime: row.reminder_at,
    priority: row.priority,
    status: row.status,
    isCompleted: row.status === 'COMPLETED',
    wasCarriedForward: row.was_carried_forward,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapMeetingRowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    location: row.location,
    attendees: row.attendees,
    dateTime: row.scheduled_at,
    status: row.status,
    isCompleted: row.status === 'COMPLETED',
    minutes: row.minutes,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}
