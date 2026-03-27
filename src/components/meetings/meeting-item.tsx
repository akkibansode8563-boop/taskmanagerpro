"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type Meeting } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Calendar, NotebookPen } from 'lucide-react';
import MeetingItemActions from './meeting-item-actions';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '../ui/button';
import { AddMinutesDialog } from './add-minutes-dialog';

interface MeetingItemProps {
  meeting: Meeting;
}

const MeetingItem: React.FC<MeetingItemProps> = ({ meeting }) => {
  const [isCompleted, setIsCompleted] = useState(meeting.isCompleted);
  const [isMinutesDialogOpen, setIsMinutesDialogOpen] = useState(false);
  const { firestore, user } = useFirebase();
  
  useEffect(() => {
    setIsCompleted(meeting.isCompleted);
  }, [meeting.isCompleted]);

  const handleStatusChange = (checked: boolean) => {
    if (!user) return;
    setIsCompleted(checked);
    const meetingRef = doc(firestore, 'users', user.uid, 'meetings', meeting.id);
    updateDocumentNonBlocking(meetingRef, { isCompleted: checked });
  };
  
  const handleMinutesSuccess = () => {
    setIsMinutesDialogOpen(false);
  };

  return (
    <>
    <Card className={cn(
      "transition-all", 
      isCompleted && "bg-muted/50"
    )}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`meeting-${meeting.id}`}
            checked={isCompleted}
            onCheckedChange={(checked) => handleStatusChange(Boolean(checked))}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor={`meeting-${meeting.id}`}
              className={cn(
                "font-medium leading-none cursor-pointer",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {meeting.title}
            </label>
            {meeting.subtitle && (
              <p className={cn("text-sm text-muted-foreground mt-1", isCompleted && "line-through")}>
                {meeting.subtitle}
              </p>
            )}
          </div>
          <MeetingItemActions meeting={meeting} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pl-10">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatDateTime(meeting.dateTime)}</span>
          </div>
          {isCompleted && (
            <Button variant="outline" size="sm" onClick={() => setIsMinutesDialogOpen(true)}>
              <NotebookPen className="h-4 w-4 mr-2" />
              {meeting.minutes ? 'View/Edit Minutes' : 'Add Minutes'}
            </Button>
          )}
        </div>
        
        {isCompleted && meeting.minutes && (
          <div className="pl-10 mt-2">
            <Card>
              <CardHeader className='p-4'>
                <CardTitle className="text-base">Minutes of Meeting</CardTitle>
              </CardHeader>
              <CardContent className='p-4 pt-0'>
                <p className="text-sm whitespace-pre-wrap">{meeting.minutes}</p>
              </CardContent>
            </Card>
          </div>
        )}

      </CardContent>
    </Card>
    <AddMinutesDialog 
      isOpen={isMinutesDialogOpen}
      setIsOpen={setIsMinutesDialogOpen}
      meeting={meeting}
      onSuccess={handleMinutesSuccess}
    />
    </>
  );
};

export default MeetingItem;

    