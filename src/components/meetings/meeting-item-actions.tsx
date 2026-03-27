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
import { type Meeting } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import { formatDateTime } from '@/lib/utils';
import EditMeetingSheet from './edit-meeting-sheet';
import { useFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface MeetingItemActionsProps {
  meeting: Meeting;
}

const MeetingItemActions: React.FC<MeetingItemActionsProps> = ({ meeting }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const formatMeetingForSharing = (m: Meeting): string => {
    let shareText = `🗓️ Meeting: ${m.title}\n`;
    if (m.subtitle) shareText += `👥 Subtitle: ${m.subtitle}\n`;
    shareText += `⏰ Time: ${formatDateTime(m.dateTime)}\n`;
    shareText += `Status: ${m.isCompleted ? "Completed" : "Pending"}\n\n`;
    shareText += `Created by: ${user?.displayName || 'A colleague'}\n`;
    shareText += "Shared from TaskMaster Pro";
    return shareText;
  };

  const handleShare = async (platform: 'whatsapp' | 'native' = 'native') => {
    const shareText = formatMeetingForSharing(meeting);
    if (platform === 'whatsapp') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meeting from TaskMaster Pro',
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
        handleCopy();
        toast({
            title: "Sharing not supported",
            description: "Meeting details copied to clipboard instead.",
        });
    }
  };

  const handleCopy = () => {
    const shareText = formatMeetingForSharing(meeting);
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Copied to clipboard",
      description: "Meeting details have been copied.",
    });
  };

  const handleDelete = () => {
    if (!user) return;
    const meetingRef = doc(firestore, 'users', user.uid, 'meetings', meeting.id);
    deleteDocumentNonBlocking(meetingRef);
    setShowDeleteDialog(false);
    toast({
        title: "Meeting Deleted",
        description: `"${meeting.title}" has been deleted.`,
    })
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    toast({
      title: 'Meeting Updated',
      description: 'The meeting details have been saved.',
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

      <EditMeetingSheet
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        meeting={meeting}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{meeting.title}"? This action cannot be undone.
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

export default MeetingItemActions;
