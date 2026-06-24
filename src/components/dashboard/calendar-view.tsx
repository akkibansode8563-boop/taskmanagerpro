'use client';

import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isToday,
  add,
  sub,
  isSameDay,
  parseISO,
  getYear,
  setYear,
  setMonth,
  getMonth,
} from 'date-fns';
import { type Task, type Meeting } from '@/lib/types';
import { isMeetingDone, isTaskDone } from '@/lib/workflow';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'meeting';
  isCompleted: boolean;
  details: string | null;
}

interface CalendarViewProps {
  tasks: Task[];
  meetings: Meeting[];
  isLoading: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, meetings, isLoading }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks.map(task => ({
      id: task.id,
      title: task.name,
      date: parseISO(task.dueDate),
      type: 'task',
      isCompleted: isTaskDone(task),
      details: task.details,
    }));
    const meetingEvents: CalendarEvent[] = meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      date: parseISO(meeting.dateTime),
      type: 'meeting',
      isCompleted: isMeetingDone(meeting),
      details: meeting.subtitle,
    }));
    return [...taskEvents, ...meetingEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, meetings]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });
  
  const startingDayIndex = getDay(firstDayOfMonth);

  const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));
  const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
  const goToToday = () => setCurrentDate(new Date());

  const handleMonthChange = (monthIndex: string) => {
    setCurrentDate(setMonth(currentDate, parseInt(monthIndex, 10)));
  };

  const handleYearChange = (year: string) => {
    setCurrentDate(setYear(currentDate, parseInt(year, 10)));
  };

  const currentYear = getYear(new Date());
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i), 'MMMM'),
  }));


  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-7">
                {weekDays.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r border-b">
                        <Skeleton className="h-5 w-8 mx-auto" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-5 h-full">
                {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="p-2 border-r border-b h-28">
                       <Skeleton className="h-5 w-5 mb-2" />
                       <Skeleton className="h-4 w-full mb-1" />
                       <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg bg-card text-card-foreground">
      <header className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:p-4">
        <h2 className="text-lg font-semibold whitespace-nowrap">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
           <Select value={String(getMonth(currentDate))} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] min-w-[130px] sm:w-[140px]">
                  <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                  {monthOptions.map(month => (
                      <SelectItem key={month.value} value={String(month.value)}>
                          {month.label}
                      </SelectItem>
                  ))}
              </SelectContent>
           </Select>
           <Select value={String(getYear(currentDate))} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] min-w-[96px] sm:w-[100px]">
                  <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                  {yearOptions.map(year => (
                      <SelectItem key={year} value={String(year)}>
                          {year}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>
      
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
            {weekDays.map(day => (
              <div key={day} className="border-b border-r py-2 last:border-r-0">{day}</div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 grid-rows-5">
            {Array.from({ length: startingDayIndex }).map((_, index) => (
              <div key={`empty-${index}`} className="border-b border-r" />
            ))}

            {daysInMonth.map(day => {
              const dayEvents = events.filter(event => isSameDay(event.date, day));
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'relative h-full min-h-[120px] overflow-y-auto border-b border-r p-2',
                    !isSameMonth(day, currentDate) && 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm',
                      isToday(day) && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <Popover key={event.id}>
                        <PopoverTrigger asChild>
                           <div
                            className={cn(
                              'w-full cursor-pointer truncate rounded-md p-1 text-left text-xs',
                              event.type === 'task' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                              event.isCompleted && 'line-through opacity-70'
                            )}
                          >
                            {event.title}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                            <div className="mb-2 flex items-start gap-2">
                               {event.type === 'task' ? <ClipboardList className="mt-1 h-4 w-4 text-red-500" /> : <Calendar className="mt-1 h-4 w-4 text-blue-500" />}
                                <div>
                                    <h4 className="font-semibold">{event.title}</h4>
                                    <p className="text-sm text-muted-foreground">{format(event.date, 'MMM d, h:mm a')}</p>
                                </div>
                            </div>
                             {event.details && <p className="text-sm">{event.details}</p>}
                        </PopoverContent>
                      </Popover>
                    ))}
                     {dayEvents.length > 3 && (
                        <div className="p-1 text-xs text-muted-foreground">+ {dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
             {Array.from({ length: 42 - daysInMonth.length - startingDayIndex }).map((_, index) => (
              <div key={`empty-end-${index}`} className="border-b border-r" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
