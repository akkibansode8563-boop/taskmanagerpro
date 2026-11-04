'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { calculateSnoozeDate } from '@/lib/sync-logic';
import { updateTaskRecord } from '@/supabase';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface InAppReminderDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InAppReminderDialog({ task, isOpen, onClose }: InAppReminderDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  if (!task) return null;

  const handleSnooze = async (minutes: number) => {
    try {
      const nextReminder = calculateSnoozeDate(Date.now(), minutes);
      await updateTaskRecord(task, {
        reminderTime: nextReminder,
      });
      toast({
        title: `Reminder snoozed`,
        description: `Snoozed for ${minutes} minutes until ${formatDateTime(nextReminder)}.`,
      });
      onClose();
    } catch (err) {
      toast({
        title: 'Error snoozing reminder',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkDone = async () => {
    try {
      await updateTaskRecord(task, {
        status: 'COMPLETED',
      });
      toast({
        title: 'Task marked as completed',
        description: `"${task.name}" is now done.`,
      });
      onClose();
    } catch (err) {
      toast({
        title: 'Error completing task',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleOpen = () => {
    onClose();
    router.push(`/tasks?highlight=${task.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-5 w-5 animate-bounce" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold">Task Reminder</DialogTitle>
              <DialogDescription className="text-xs">
                {task.reminderTime ? `Scheduled for ${formatDateTime(task.reminderTime)}` : 'Due soon'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-foreground text-base">{task.name}</h4>
              <Badge
                variant="outline"
                className={
                  task.priority === 'HIGH'
                    ? 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400'
                    : task.priority === 'MEDIUM'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }
              >
                {task.priority}
              </Badge>
            </div>
            {task.details && (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{task.details}</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Snooze options:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSnooze(5)}
              className="text-xs"
            >
              +5 min
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSnooze(15)}
              className="text-xs"
            >
              +15 min
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSnooze(60)}
              className="text-xs"
            >
              +1 hour
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpen}
            className="flex items-center gap-1.5 justify-center"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open Task</span>
          </Button>

          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Dismiss
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleMarkDone}
              className="flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Done</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
