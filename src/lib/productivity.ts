import { addDays, compareAsc, endOfDay, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import type { Meeting, Task, TaskPriority } from '@/lib/types';

export type AgendaItem = {
  id: string;
  title: string;
  details: string | null;
  date: string;
  kind: 'task' | 'meeting';
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
  todayItems: AgendaItem[];
  upcomingItems: AgendaItem[];
  overdueItems: AgendaItem[];
};

const sortAgendaItems = (a: AgendaItem, b: AgendaItem) =>
  compareAsc(parseISO(a.date), parseISO(b.date));

export function getProductivityInsights(
  tasks: Task[],
  meetings: Meeting[],
  now = new Date()
): ProductivityInsights {
  const start = startOfDay(now);
  const end = endOfDay(now);
  const nextWeek = endOfDay(addDays(now, 7));

  const pendingTasks = tasks.filter((task) => !task.isCompleted);
  const completedTasks = tasks.length - pendingTasks.length;
  const pendingMeetings = meetings.filter((meeting) => !meeting.isCompleted);
  const completedMeetings = meetings.length - pendingMeetings.length;

  const taskAgendaItems: AgendaItem[] = tasks.map((task) => {
    const taskDate = parseISO(task.dueDate);
    const isToday = isWithinInterval(taskDate, { start, end });
    const isOverdue = !task.isCompleted && taskDate < start;

    return {
      id: task.id,
      title: task.name,
      details: task.details,
      date: task.dueDate,
      kind: 'task',
      isCompleted: task.isCompleted,
      isToday,
      isOverdue,
      priority: task.priority,
    };
  });

  const meetingAgendaItems: AgendaItem[] = meetings.map((meeting) => {
    const meetingDate = parseISO(meeting.dateTime);
    const isToday = isWithinInterval(meetingDate, { start, end });

    return {
      id: meeting.id,
      title: meeting.title,
      details: meeting.subtitle,
      date: meeting.dateTime,
      kind: 'meeting',
      isCompleted: meeting.isCompleted,
      isToday,
      isOverdue: !meeting.isCompleted && meetingDate < start,
    };
  });

  const agenda = [...taskAgendaItems, ...meetingAgendaItems].sort(sortAgendaItems);
  const totalEvents = tasks.length + meetings.length;

  return {
    pendingTasks: pendingTasks.length,
    completedTasks,
    pendingMeetings: pendingMeetings.length,
    completedMeetings,
    totalEvents,
    overdueTasks: pendingTasks.filter((task) => parseISO(task.dueDate) < start).length,
    tasksDueToday: pendingTasks.filter((task) =>
      isWithinInterval(parseISO(task.dueDate), { start, end })
    ).length,
    meetingsToday: pendingMeetings.filter((meeting) =>
      isWithinInterval(parseISO(meeting.dateTime), { start, end })
    ).length,
    completionRate:
      totalEvents === 0
        ? 0
        : Math.round(((completedTasks + completedMeetings) / totalEvents) * 100),
    priorityBreakdown: {
      HIGH: pendingTasks.filter((task) => task.priority === 'HIGH').length,
      MEDIUM: pendingTasks.filter((task) => task.priority === 'MEDIUM').length,
      LOW: pendingTasks.filter((task) => task.priority === 'LOW').length,
    },
    todayItems: agenda.filter((item) => item.isToday && !item.isCompleted),
    upcomingItems: agenda.filter(
      (item) =>
        !item.isCompleted &&
        parseISO(item.date) >= start &&
        parseISO(item.date) <= nextWeek
    ),
    overdueItems: agenda.filter((item) => item.isOverdue),
  };
}
