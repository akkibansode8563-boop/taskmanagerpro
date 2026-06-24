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
import { type Meeting } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { meetingStatusLabel, normalizeMeeting } from '@/lib/workflow';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import EditMeetingSheet from './edit-meeting-sheet';
import { deleteMeetingRecord, useUser } from '@/supabase';

interface MeetingItemActionsProps {
  meeting: Meeting;
}

const MeetingItemActions: React.FC<MeetingItemActionsProps> = ({ meeting }) => {
  const normalizedMeeting = normalizeMeeting(meeting);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const formatMeetingForSharing = (meetingToShare: Meeting): string => {
    const normalized = normalizeMeeting(meetingToShare);
    let shareText = `Meeting: ${normalized.title}\n`;
    if (normalized.subtitle) shareText += `Agenda: ${normalized.subtitle}\n`;
    if (normalized.location) shareText += `Location: ${normalized.location}\n`;
    if (normalized.attendees) shareText += `Attendees: ${normalized.attendees}\n`;
    shareText += `Time: ${formatDateTime(normalized.dateTime)}\n`;
    shareText += `Status: ${meetingStatusLabel[normalized.status]}\n\n`;
    shareText += `Created by: ${(user?.user_metadata?.display_name as string | undefined) || user?.email || 'A colleague'}\n`;
    shareText += 'Shared from TaskMaster Pro';
    return shareText;
  };

  const handleShare = async (platform: 'whatsapp' | 'native' = 'native') => {
    const shareText = formatMeetingForSharing(normalizedMeeting);
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meeting from TaskMaster Pro',
          text: shareText,
        });
      } catch {
        // Ignore cancelled shares.
      }
    } else {
      handleCopy();
      toast({
        title: 'Sharing not supported',
        description: 'Meeting details were copied to your clipboard instead.',
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatMeetingForSharing(normalizedMeeting));
    toast({
      title: 'Copied to clipboard',
      description: 'Meeting details have been copied.',
    });
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteMeetingRecord(normalizedMeeting.id);
      setShowDeleteDialog(false);
      toast({
        title: 'Meeting Deleted',
        description: `"${normalizedMeeting.title}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Could not delete meeting',
        description: (error as { message?: string })?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

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

      <EditMeetingSheet isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} meeting={normalizedMeeting} onSuccess={handleEditSuccess} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{normalizedMeeting.title}&quot;? This action cannot be undone.
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

export default MeetingItemActions;
