'use client';

import type { User } from '@supabase/supabase-js';
import { cancelTaskReminder, scheduleTaskReminder } from '@/lib/mobile-reminders';
import { emitMeetingMutation, emitTaskMutation } from '@/lib/live-sync';
import { normalizeMeeting, normalizeTask } from '@/lib/workflow';
import type { Meeting, MeetingStatus, Task, TaskPriority, TaskStatus } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/supabase/client';

const supabase = getSupabaseBrowserClient();

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `tmp-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export async function ensureProfile(user: User, displayName?: string | null) {
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? null,
    display_name: displayName ?? user.user_metadata?.display_name ?? null,
    last_login_at: new Date().toISOString(),
  });
}

export async function createTaskRecord(
  user: User,
  data: {
    name: string;
    details: string | null;
    category: string | null;
    dueDate: string;
    reminderTime: string | null;
    priority: TaskPriority;
    status: TaskStatus;
  }
) {
  const id = createId();
  const createdTask: Task = {
    id,
    name: data.name,
    details: data.details,
    category: data.category,
    dueDate: data.dueDate,
    reminderTime: data.reminderTime,
    priority: data.priority,
    status: data.status,
    isCompleted: data.status === 'COMPLETED',
    wasCarriedForward: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { error } = await supabase.from('tasks').insert({
    id,
    user_id: user.id,
    name: data.name,
    details: data.details,
    category: data.category,
    due_at: data.dueDate,
    reminder_at: data.reminderTime,
    priority: data.priority,
    status: data.status,
    was_carried_forward: false,
  });

  if (error) throw error;

  emitTaskMutation({ type: 'created', task: createdTask });
  await scheduleTaskReminder(createdTask);
  return createdTask;
}

export async function updateTaskRecord(task: Task, data: Partial<Task>) {
  const normalizedTask = normalizeTask({ ...task, ...data });
  const { error } = await supabase
    .from('tasks')
    .update({
      name: normalizedTask.name,
      details: normalizedTask.details,
      category: normalizedTask.category ?? null,
      due_at: normalizedTask.dueDate,
      reminder_at: normalizedTask.reminderTime,
      priority: normalizedTask.priority,
      status: normalizedTask.status,
      was_carried_forward: normalizedTask.wasCarriedForward,
    })
    .eq('id', normalizedTask.id);

  if (error) throw error;

  emitTaskMutation({ type: 'updated', task: normalizedTask });
  await scheduleTaskReminder(normalizedTask);
  return normalizedTask;
}

export async function deleteTaskRecord(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
  emitTaskMutation({ type: 'deleted', taskId });
  await cancelTaskReminder(taskId);
}

export async function createMeetingRecord(
  user: User,
  data: {
    title: string;
    subtitle: string | null;
    location: string | null;
    attendees: string | null;
    dateTime: string;
    status: MeetingStatus;
  }
) {
  const id = createId();
  const createdMeeting: Meeting = {
    id,
    title: data.title,
    subtitle: data.subtitle,
    location: data.location,
    attendees: data.attendees,
    dateTime: data.dateTime,
    status: data.status,
    isCompleted: data.status === 'COMPLETED',
    minutes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { error } = await supabase.from('meetings').insert({
    id,
    user_id: user.id,
    title: data.title,
    subtitle: data.subtitle,
    location: data.location,
    attendees: data.attendees,
    scheduled_at: data.dateTime,
    status: data.status,
    minutes: null,
  });

  if (error) throw error;
  emitMeetingMutation({ type: 'created', meeting: createdMeeting });
  return createdMeeting;
}

export async function updateMeetingRecord(meeting: Meeting, data: Partial<Meeting>) {
  const normalizedMeeting = normalizeMeeting({ ...meeting, ...data });
  const { error } = await supabase
    .from('meetings')
    .update({
      title: normalizedMeeting.title,
      subtitle: normalizedMeeting.subtitle,
      location: normalizedMeeting.location ?? null,
      attendees: normalizedMeeting.attendees ?? null,
      scheduled_at: normalizedMeeting.dateTime,
      status: normalizedMeeting.status,
      minutes: normalizedMeeting.minutes ?? null,
    })
    .eq('id', normalizedMeeting.id);

  if (error) throw error;
  emitMeetingMutation({ type: 'updated', meeting: normalizedMeeting });
  return normalizedMeeting;
}

export async function deleteMeetingRecord(meetingId: string) {
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
  if (error) throw error;
  emitMeetingMutation({ type: 'deleted', meetingId });
}

export async function updateMeetingMinutes(meetingId: string, minutes: string) {
  const { error } = await supabase.from('meetings').update({ minutes, status: 'COMPLETED' }).eq('id', meetingId);
  if (error) throw error;
}
