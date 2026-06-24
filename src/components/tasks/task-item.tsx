"use client";

import React, { useEffect, useState } from 'react';
import { Bell, CalendarDays, Flag, History, Layers3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type Task } from '@/lib/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { normalizeTask, taskStatusLabel } from '@/lib/workflow';
import { updateTaskRecord, useUser } from '@/supabase';
import TaskItemActions from './task-item-actions';

interface TaskItemProps {
  task: Task;
  onStatusChange?: (taskId: string, status: ReturnType<typeof normalizeTask>['status']) => void;
}

const PriorityBadge = ({ priority }: { priority: Task['priority'] }) => {
  const priorityStyles = {
    HIGH: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
    MEDIUM: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800',
    LOW: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
  };

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', priorityStyles[priority])}>
      <Flag className="h-3 w-3" />
      {priority}
    </Badge>
  );
};

const statusClasses = {
  TODO: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
  BLOCKED: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusChange }) => {
  const normalizedTask = normalizeTask(task);
  const [optimisticStatus, setOptimisticStatus] = useState(normalizedTask.status);
  const { user } = useUser();

  useEffect(() => {
    setOptimisticStatus(normalizedTask.status);
  }, [normalizedTask.status]);

  const isCompleted = optimisticStatus === 'COMPLETED';
  const visibleTask = {
    ...normalizedTask,
    status: optimisticStatus,
    isCompleted,
  };

  const handleStatusChange = async (checked: boolean) => {
    if (!user) return;
    const nextStatus = checked ? 'COMPLETED' : 'TODO';
    const previousStatus = optimisticStatus;
    setOptimisticStatus(nextStatus);
    onStatusChange?.(normalizedTask.id, nextStatus);
    try {
      await updateTaskRecord(normalizedTask, {
        status: nextStatus,
      });
    } catch {
      setOptimisticStatus(previousStatus);
      onStatusChange?.(normalizedTask.id, previousStatus);
    }
  };

  return (
    <Card className={cn('transition-all', isCompleted && 'bg-muted/50')}>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`task-${task.id}`}
            checked={isCompleted}
            onCheckedChange={(checked) => handleStatusChange(Boolean(checked))}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={`task-${task.id}`}
                className={cn('font-medium leading-none cursor-pointer', isCompleted && 'line-through text-muted-foreground')}
              >
                {visibleTask.name}
              </label>
              <Badge variant="outline" className={statusClasses[visibleTask.status]}>
                {taskStatusLabel[visibleTask.status]}
              </Badge>
              {visibleTask.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Layers3 className="h-3 w-3" />
                  {visibleTask.category}
                </Badge>
              )}
            </div>
            {visibleTask.details && (
              <p className={cn('mt-1 text-sm text-muted-foreground', isCompleted && 'line-through')}>
                {visibleTask.details}
              </p>
            )}
          </div>
          <TaskItemActions task={visibleTask} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span>{formatDate(visibleTask.dueDate)}</span>
          </div>
          {visibleTask.reminderTime && (
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              <span>{formatDateTime(visibleTask.reminderTime)}</span>
            </div>
          )}
          <PriorityBadge priority={visibleTask.priority} />
          {visibleTask.wasCarriedForward && (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <History className="h-3 w-3" />
              Carried Forward
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskItem;
