"use client";

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Copy, FilePenLine, MoreVertical, Share2, Trash2 } from 'lucide-react';
import { type Task } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils';
import { normalizeTask, taskStatusLabel } from '@/lib/workflow';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import EditTaskSheet from './edit-task-sheet';
import { deleteTaskRecord, useUser } from '@/supabase';

interface TaskItemActionsProps {
  task: Task;
}

const TaskItemActions: React.FC<TaskItemActionsProps> = ({ task }) => {
  const normalizedTask = normalizeTask(task);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const formatTaskForSharing = (taskToShare: Task): string => {
    const normalized = normalizeTask(taskToShare);
    let shareText = `Task: ${normalized.name}\n`;
    if (normalized.details) shareText += `Details: ${normalized.details}\n`;
    if (normalized.category) shareText += `Category: ${normalized.category}\n`;
    shareText += `Due: ${formatDate(normalized.dueDate)}\n`;
    if (normalized.reminderTime) shareText += `Reminder: ${formatTime(normalized.reminderTime)}\n`;
    shareText += `Priority: ${normalized.priority}\n`;
    shareText += `Status: ${taskStatusLabel[normalized.status]}\n\n`;
    shareText += `Created by: ${(user?.user_metadata?.display_name as string | undefined) || user?.email || 'A colleague'}\n`;
    shareText += 'Shared from TaskMaster Pro';
    return shareText;
  };

  const handleShare = async (platform: 'whatsapp' | 'native' = 'native') => {
    const shareText = formatTaskForSharing(normalizedTask);
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Task from TaskMaster Pro',
          text: shareText,
        });
      } catch {
        // Ignore cancelled shares.
      }
    } else {
      handleCopy();
      toast({
        title: 'Sharing not supported',
        description: 'Task details were copied to your clipboard instead.',
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatTaskForSharing(normalizedTask));
    toast({
      title: 'Copied to clipboard',
      description: 'Task details have been copied.',
    });
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteTaskRecord(normalizedTask.id);
      setShowDeleteDialog(false);
      toast({
        title: 'Task Deleted',
        description: `"${normalizedTask.name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Could not delete task',
        description: (error as { message?: string })?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    toast({
      title: 'Task Updated',
      description: 'The task details have been saved.',
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            <FilePenLine className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('native')}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>Share</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
            <WhatsAppIcon className="mr-2 h-4 w-4" />
            <span>Share to WhatsApp</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTaskSheet isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} task={normalizedTask} onSuccess={handleEditSuccess} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{normalizedTask.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskItemActions;
