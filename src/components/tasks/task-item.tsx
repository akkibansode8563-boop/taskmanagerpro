"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { type Task } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { CalendarDays, Bell, Flag, History } from 'lucide-react';
import TaskItemActions from './task-item-actions';
import FormattedTime from '../shared/formatted-time';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface TaskItemProps {
  task: Task;
}

const PriorityBadge = ({ priority }: { priority: Task['priority'] }) => {
  const priorityStyles = {
    HIGH: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
    MEDIUM: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800',
    LOW: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
  };

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", priorityStyles[priority])}>
      <Flag className="h-3 w-3" />
      {priority}
    </Badge>
  );
};

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const [isCompleted, setIsCompleted] = useState(task.isCompleted);
  const { firestore, user } = useFirebase();

  useEffect(() => {
    setIsCompleted(task.isCompleted);
  }, [task.isCompleted]);

  const handleStatusChange = (checked: boolean) => {
    if (!user) return;
    setIsCompleted(checked);
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, { isCompleted: checked });
  };

  return (
    <Card className={cn(
      "transition-all", 
      isCompleted && "bg-muted/50"
    )}>
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`task-${task.id}`}
            checked={isCompleted}
            onCheckedChange={(checked) => handleStatusChange(Boolean(checked))}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                "font-medium leading-none cursor-pointer",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.name}
            </label>
            {task.details && (
              <p className={cn("text-sm text-muted-foreground mt-1", isCompleted && "line-through")}>
                {task.details}
              </p>
            )}
          </div>
          <TaskItemActions task={task} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pl-10">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
          {task.reminderTime && (
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              <FormattedTime date={task.reminderTime} />
            </div>
          )}
          <PriorityBadge priority={task.priority} />
          {task.wasCarriedForward && (
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
