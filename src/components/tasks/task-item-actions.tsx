"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { MoreVertical, Share2, Copy, Trash2, FilePenLine } from 'lucide-react';
import { type Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import { formatDate, formatTime } from '@/lib/utils';
import EditTaskSheet from './edit-task-sheet';
import { useFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface TaskItemActionsProps {
  task: Task;
}

const TaskItemActions: React.FC<TaskItemActionsProps> = ({ task }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const formatTaskForSharing = (t: Task): string => {
    let shareText = `📋 Task: ${t.name}\n`;
    if (t.details) shareText += `📝 Details: ${t.details}\n`;
    shareText += `📅 Due: ${formatDate(t.dueDate)}\n`;
    if (t.reminderTime) shareText += `⏰ Reminder: ${formatTime(t.reminderTime)}\n`;
    shareText += `Status: ${t.isCompleted ? "Completed" : "Pending"}\n\n`;
    shareText += `Created by: ${user?.displayName || 'A colleague'}\n`;
    shareText += "Shared from TaskMaster Pro";
    return shareText;
  };
  
  const handleShare = async (platform: 'whatsapp' | 'native' = 'native') => {
    const shareText = formatTaskForSharing(task);
    if (platform === 'whatsapp') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Task from TaskMaster Pro',
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
        // Fallback for browsers that don't support Web Share API
        handleCopy();
        toast({
            title: "Sharing not supported",
            description: "Task details copied to clipboard instead.",
        });
    }
  };

  const handleCopy = () => {
    const shareText = formatTaskForSharing(task);
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Copied to clipboard",
      description: "Task details have been copied.",
    });
  };

  const handleDelete = () => {
    if (!user) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', task.id);
    deleteDocumentNonBlocking(taskRef);
    setShowDeleteDialog(false);
    toast({
        title: "Task Deleted",
        description: `"${task.name}" has been deleted.`,
    })
  }

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

      <EditTaskSheet 
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        task={task}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskItemActions;
