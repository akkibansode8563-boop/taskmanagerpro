
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { type Meeting } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const meetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().nullable(),
  dateTime: z.string().min(1, 'Date and time are required'),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

interface EditMeetingSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  meeting: Meeting;
  onSuccess: () => void;
}

const EditMeetingSheet: React.FC<EditMeetingSheetProps> = ({ isOpen, setIsOpen, meeting, onSuccess }) => {
  const { firestore, user } = useFirebase();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const router = useRouter();

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
  });

  useEffect(() => {
    if (isOpen && meeting) {
      setEditingMeeting(meeting);
      form.reset({
        ...meeting,
        subtitle: meeting.subtitle || '',
        dateTime: new Date(meeting.dateTime).toISOString().slice(0, 16),
      });
    }
  }, [isOpen, meeting, form]);

  const onSubmit = async (data: MeetingFormValues) => {
    if (!user || !editingMeeting) return;
    const meetingRef = doc(firestore, 'users', user.uid, 'meetings', editingMeeting.id);
    await updateDoc(meetingRef, {
      ...data,
      subtitle: data.subtitle || null,
      dateTime: new Date(data.dateTime).toISOString(),
      updatedAt: serverTimestamp(),
    });
    onSuccess();
    window.location.reload();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Edit Meeting</SheetTitle>
          <SheetDescription>
            Update the details for your meeting.
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
                  <FormLabel>Subtitle (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Engineering Team" {...field} value={field.value ?? ''} />
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
