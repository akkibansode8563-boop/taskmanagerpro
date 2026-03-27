"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { type Meeting, type MeetingStatus } from '@/lib/types';
import { normalizeMeeting } from '@/lib/workflow';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const meetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().nullable(),
  location: z.string().nullable(),
  attendees: z.string().nullable(),
  dateTime: z.string().min(1, 'Date and time are required'),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

interface EditMeetingSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  meeting: Meeting;
  onSuccess: () => void;
}

const meetingStatuses: MeetingStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const EditMeetingSheet: React.FC<EditMeetingSheetProps> = ({ isOpen, setIsOpen, meeting, onSuccess }) => {
  const { firestore, user } = useFirebase();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
  });

  useEffect(() => {
    if (isOpen && meeting) {
      const normalizedMeeting = normalizeMeeting(meeting);
      setEditingMeeting(normalizedMeeting);
      form.reset({
        title: normalizedMeeting.title,
        subtitle: normalizedMeeting.subtitle || '',
        location: normalizedMeeting.location || '',
        attendees: normalizedMeeting.attendees || '',
        dateTime: new Date(normalizedMeeting.dateTime).toISOString().slice(0, 16),
        status: normalizedMeeting.status,
      });
    }
  }, [form, isOpen, meeting]);

  const onSubmit = async (data: MeetingFormValues) => {
    if (!user || !editingMeeting) return;

    const meetingRef = doc(firestore, 'users', user.uid, 'meetings', editingMeeting.id);
    await updateDoc(meetingRef, {
      title: data.title,
      subtitle: data.subtitle || null,
      location: data.location || null,
      attendees: data.attendees || null,
      dateTime: new Date(data.dateTime).toISOString(),
      status: data.status,
      isCompleted: data.status === 'COMPLETED',
      updatedAt: serverTimestamp(),
    });

    onSuccess();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Edit Meeting</SheetTitle>
          <SheetDescription>
            Update the meeting plan, people, or status without leaving the workflow.
          </SheetDescription>
        </SheetHeader>
        {editingMeeting && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Weekly Sync" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agenda or Subtitle</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engineering Team" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Google Meet" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {meetingStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendees</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Product Team, Client POC" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date and Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default EditMeetingSheet;
