"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, NotebookPen, Users } from 'lucide-react';
import { AddMinutesDialog } from '@/components/meetings/add-minutes-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type Meeting } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { meetingStatusLabel, normalizeMeeting } from '@/lib/workflow';
import { updateMeetingRecord, useUser } from '@/supabase';
import MeetingItemActions from './meeting-item-actions';

interface MeetingItemProps {
  meeting: Meeting;
}

const statusClasses = {
  SCHEDULED: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800',
};

const MeetingItem: React.FC<MeetingItemProps> = ({ meeting }) => {
  const normalizedMeeting = normalizeMeeting(meeting);
  const [isCompleted, setIsCompleted] = useState(normalizedMeeting.status === 'COMPLETED');
  const [isMinutesDialogOpen, setIsMinutesDialogOpen] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setIsCompleted(normalizedMeeting.status === 'COMPLETED');
  }, [normalizedMeeting.status]);

  const handleStatusChange = async (checked: boolean) => {
    if (!user) return;
    setIsCompleted(checked);
    try {
      await updateMeetingRecord(normalizedMeeting, {
        status: checked ? 'COMPLETED' : 'SCHEDULED',
      });
    } catch {
      setIsCompleted(!checked);
    }
  };

  const handleMinutesSuccess = () => {
    setIsMinutesDialogOpen(false);
  };

  return (
    <>
      <Card className={cn('transition-all', isCompleted && 'bg-muted/50')}>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-4">
            <Checkbox
              id={`meeting-${meeting.id}`}
              checked={isCompleted}
              onCheckedChange={(checked) => handleStatusChange(Boolean(checked))}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor={`meeting-${meeting.id}`}
                  className={cn('font-medium leading-none cursor-pointer', isCompleted && 'line-through text-muted-foreground')}
                >
                  {normalizedMeeting.title}
                </label>
                <Badge variant="outline" className={statusClasses[normalizedMeeting.status]}>
                  {meetingStatusLabel[normalizedMeeting.status]}
                </Badge>
              </div>
              {normalizedMeeting.subtitle && (
                <p className={cn('mt-1 text-sm text-muted-foreground', isCompleted && 'line-through')}>
                  {normalizedMeeting.subtitle}
                </p>
              )}
            </div>
            <MeetingItemActions meeting={normalizedMeeting} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime(normalizedMeeting.dateTime)}</span>
            </div>
            {normalizedMeeting.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{normalizedMeeting.location}</span>
              </div>
            )}
            {normalizedMeeting.attendees && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{normalizedMeeting.attendees}</span>
              </div>
            )}
            {normalizedMeeting.status === 'COMPLETED' && (
              <Button variant="outline" size="sm" onClick={() => setIsMinutesDialogOpen(true)}>
                <NotebookPen className="mr-2 h-4 w-4" />
                {normalizedMeeting.minutes ? 'View/Edit Minutes' : 'Add Minutes'}
              </Button>
            )}
          </div>

          {normalizedMeeting.status === 'COMPLETED' && normalizedMeeting.minutes && (
            <div className="pl-10">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">Minutes of Meeting</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="whitespace-pre-wrap text-sm">{normalizedMeeting.minutes}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
      <AddMinutesDialog
        isOpen={isMinutesDialogOpen}
        setIsOpen={setIsMinutesDialogOpen}
        meeting={normalizedMeeting}
        onSuccess={handleMinutesSuccess}
      />
    </>
  );
};

export default MeetingItem;
