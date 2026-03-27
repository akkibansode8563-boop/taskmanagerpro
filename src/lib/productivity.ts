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

  const pendingTasks = normalizedTasks.filter((task) => !isTaskDone(task));
  const completedTasks = normalizedTasks.length - pendingTasks.length;
  const pendingMeetings = normalizedMeetings.filter((meeting) => !isMeetingDone(meeting));
  const completedMeetings = normalizedMeetings.length - pendingMeetings.length;

  const taskAgendaItems: AgendaItem[] = normalizedTasks.map((task) => {
    const taskDate = parseISO(task.dueDate);
    const isToday = isWithinInterval(taskDate, { start, end });
    const isOverdue = !isTaskDone(task) && taskDate < start;

    return {
      id: task.id,
      title: task.name,
      details: task.details,
      date: task.dueDate,
      kind: 'task',
      status: task.status,
      isCompleted: isTaskDone(task),
      isToday,
      isOverdue,
      priority: task.priority,
    };
  });

  const meetingAgendaItems: AgendaItem[] = normalizedMeetings.map((meeting) => {
    const meetingDate = parseISO(meeting.dateTime);
    const isToday = isWithinInterval(meetingDate, { start, end });

    return {
      id: meeting.id,
      title: meeting.title,
      details: meeting.subtitle,
      date: meeting.dateTime,
      kind: 'meeting',
      status: meeting.status,
      isCompleted: isMeetingDone(meeting),
      isToday,
      isOverdue: !isMeetingDone(meeting) && meeting.status !== 'CANCELLED' && meetingDate < start,
    };
  });

  const agenda = [...taskAgendaItems, ...meetingAgendaItems].sort(sortAgendaItems);
  const totalEvents = normalizedTasks.length + normalizedMeetings.length;
  const trendDays = eachDayOfInterval({ start: lastWeek, end }).map((day) => format(day, 'EEE'));

  return {
    pendingTasks: pendingTasks.length,
    completedTasks,
    pendingMeetings: pendingMeetings.length,
    completedMeetings,
    totalEvents,
    overdueTasks: pendingTasks.filter((task) => parseISO(task.dueDate) < start).length,
    tasksDueToday: pendingTasks.filter((task) => isWithinInterval(parseISO(task.dueDate), { start, end })).length,
    meetingsToday: pendingMeetings.filter((meeting) => isWithinInterval(parseISO(meeting.dateTime), { start, end })).length,
    completionRate: totalEvents === 0 ? 0 : Math.round(((completedTasks + completedMeetings) / totalEvents) * 100),
    priorityBreakdown: {
      HIGH: pendingTasks.filter((task) => task.priority === 'HIGH').length,
      MEDIUM: pendingTasks.filter((task) => task.priority === 'MEDIUM').length,
      LOW: pendingTasks.filter((task) => task.priority === 'LOW').length,
    },
    taskStatusBreakdown: {
      TODO: normalizedTasks.filter((task) => task.status === 'TODO').length,
      IN_PROGRESS: normalizedTasks.filter((task) => task.status === 'IN_PROGRESS').length,
      BLOCKED: normalizedTasks.filter((task) => task.status === 'BLOCKED').length,
      COMPLETED: normalizedTasks.filter((task) => task.status === 'COMPLETED').length,
    },
    meetingStatusBreakdown: {
      SCHEDULED: normalizedMeetings.filter((meeting) => meeting.status === 'SCHEDULED').length,
      IN_PROGRESS: normalizedMeetings.filter((meeting) => meeting.status === 'IN_PROGRESS').length,
      COMPLETED: normalizedMeetings.filter((meeting) => meeting.status === 'COMPLETED').length,
      CANCELLED: normalizedMeetings.filter((meeting) => meeting.status === 'CANCELLED').length,
    },
    completionTrend: trendDays.map((dayLabel, index) => {
      const dayStart = startOfDay(addDays(lastWeek, index));
      const dayEnd = endOfDay(dayStart);

      const completedCount =
        normalizedTasks.filter((task) => isTaskDone(task) && task.updatedAt && isWithinInterval(new Date(task.updatedAt), { start: dayStart, end: dayEnd })).length +
        normalizedMeetings.filter((meeting) => isMeetingDone(meeting) && meeting.updatedAt && isWithinInterval(new Date(meeting.updatedAt), { start: dayStart, end: dayEnd })).length;

      const createdCount =
        normalizedTasks.filter((task) => task.createdAt && isWithinInterval(new Date(task.createdAt), { start: dayStart, end: dayEnd })).length +
        normalizedMeetings.filter((meeting) => meeting.createdAt && isWithinInterval(new Date(meeting.createdAt), { start: dayStart, end: dayEnd })).length;

      return {
        day: dayLabel,
        completed: completedCount,
        created: createdCount,
      };
    }),
    todayItems: agenda.filter((item) => item.isToday && !item.isCompleted && item.status !== 'CANCELLED'),
    upcomingItems: agenda.filter((item) => !item.isCompleted && item.status !== 'CANCELLED' && parseISO(item.date) >= start && parseISO(item.date) <= nextWeek),
    overdueItems: agenda.filter((item) => item.isOverdue),
  };
}
