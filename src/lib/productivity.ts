import { addDays, compareAsc, eachDayOfInterval, endOfDay, format, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';
import type { Meeting, MeetingStatus, Task, TaskPriority, TaskStatus } from '@/lib/types';
import { isMeetingDone, isTaskDone, normalizeMeeting, normalizeTask } from '@/lib/workflow';

export type AgendaItem = {
  id: string;
  title: string;
  details: string | null;
  date: string;
  kind: 'task' | 'meeting';
  status: TaskStatus | MeetingStatus;
  isCompleted: boolean;
  isToday: boolean;
  isOverdue: boolean;
  priority?: TaskPriority;
};

export type ProductivityInsights = {
  pendingTasks: number;
  completedTasks: number;
  pendingMeetings: number;
  completedMeetings: number;
  totalEvents: number;
  overdueTasks: number;
  tasksDueToday: number;
  meetingsToday: number;
  completionRate: number;
  priorityBreakdown: Record<TaskPriority, number>;
  taskStatusBreakdown: Record<TaskStatus, number>;
  meetingStatusBreakdown: Record<MeetingStatus, number>;
  completionTrend: { day: string; completed: number; created: number }[];
  todayItems: AgendaItem[];
  upcomingItems: AgendaItem[];
  overdueItems: AgendaItem[];
};

const sortAgendaItems = (a: AgendaItem, b: AgendaItem) => compareAsc(parseISO(a.date), parseISO(b.date));

export function getProductivityInsights(tasks: Task[], meetings: Meeting[], now = new Date()): ProductivityInsights {
  const normalizedTasks = tasks.map(normalizeTask);
  const normalizedMeetings = meetings.map(normalizeMeeting);

  const start = startOfDay(now);
  const end = endOfDay(now);
  const nextWeek = endOfDay(addDays(now, 7));
  const lastWeek = startOfDay(subDays(now, 6));

  // ── Single-pass task aggregation ────────────────────────────────────────────
  const taskStatusBreakdown: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    COMPLETED: 0,
  };
  const priorityBreakdown: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

  let pendingTaskCount = 0;
  let overdueTasks = 0;
  let tasksDueToday = 0;

  const taskAgendaItems: AgendaItem[] = normalizedTasks.map((task) => {
    const taskDate = parseISO(task.dueDate);
    const done = isTaskDone(task);
    const isToday = isWithinInterval(taskDate, { start, end });
    const isOverdue = !done && taskDate < start;

    taskStatusBreakdown[task.status] += 1;

    if (!done) {
      pendingTaskCount += 1;
      priorityBreakdown[task.priority] += 1;
      if (isOverdue) overdueTasks += 1;
      if (isToday) tasksDueToday += 1;
    }

    return {
      id: task.id,
      title: task.name,
      details: task.details,
      date: task.dueDate,
      kind: 'task',
      status: task.status,
      isCompleted: done,
      isToday,
      isOverdue,
      priority: task.priority,
    };
  });

  const completedTaskCount = normalizedTasks.length - pendingTaskCount;

  // ── Single-pass meeting aggregation ─────────────────────────────────────────
  const meetingStatusBreakdown: Record<MeetingStatus, number> = {
    SCHEDULED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  let pendingMeetingCount = 0;
  let meetingsToday = 0;

  const meetingAgendaItems: AgendaItem[] = normalizedMeetings.map((meeting) => {
    const meetingDate = parseISO(meeting.dateTime);
    const done = isMeetingDone(meeting);
    const isToday = isWithinInterval(meetingDate, { start, end });

    meetingStatusBreakdown[meeting.status] += 1;

    if (!done) {
      pendingMeetingCount += 1;
      if (isToday) meetingsToday += 1;
    }

    return {
      id: meeting.id,
      title: meeting.title,
      details: meeting.subtitle,
      date: meeting.dateTime,
      kind: 'meeting',
      status: meeting.status,
      isCompleted: done,
      isToday,
      isOverdue: !done && meeting.status !== 'CANCELLED' && meetingDate < start,
    };
  });

  const completedMeetingCount = normalizedMeetings.length - pendingMeetingCount;
  const totalEvents = normalizedTasks.length + normalizedMeetings.length;

  const agenda = [...taskAgendaItems, ...meetingAgendaItems].sort(sortAgendaItems);

  // ── 7-day completion trend ───────────────────────────────────────────────────
  const trendDays = eachDayOfInterval({ start: lastWeek, end });
  const completionTrend = trendDays.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const inRange = (ts: number | undefined) =>
      ts !== undefined && isWithinInterval(new Date(ts), { start: dayStart, end: dayEnd });

    const completed =
      normalizedTasks.filter((t) => isTaskDone(t) && inRange(t.updatedAt)).length +
      normalizedMeetings.filter((m) => isMeetingDone(m) && inRange(m.updatedAt)).length;

    const created =
      normalizedTasks.filter((t) => inRange(t.createdAt)).length +
      normalizedMeetings.filter((m) => inRange(m.createdAt)).length;

    return { day: format(day, 'EEE'), completed, created };
  });

  return {
    pendingTasks: pendingTaskCount,
    completedTasks: completedTaskCount,
    pendingMeetings: pendingMeetingCount,
    completedMeetings: completedMeetingCount,
    totalEvents,
    overdueTasks,
    tasksDueToday,
    meetingsToday,
    completionRate: totalEvents === 0 ? 0 : Math.round(((completedTaskCount + completedMeetingCount) / totalEvents) * 100),
    priorityBreakdown,
    taskStatusBreakdown,
    meetingStatusBreakdown,
    completionTrend,
    todayItems: agenda.filter((item) => item.isToday && !item.isCompleted && item.status !== 'CANCELLED'),
    upcomingItems: agenda.filter(
      (item) =>
        !item.isCompleted &&
        item.status !== 'CANCELLED' &&
        parseISO(item.date) >= start &&
        parseISO(item.date) <= nextWeek
    ),
    overdueItems: agenda.filter((item) => item.isOverdue),
  };
}
