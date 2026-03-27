"use client";

import React, { useState } from 'react';
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
  SheetTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Plus } from 'lucide-react';

const meetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().nullable(),
  dateTime: z.string().min(1, 'Date and time are required'),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

export const AddMeetingSheet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      dateTime: '',
    },
  });

  const onSubmit = (data: MeetingFormValues) => {
    if (!user) return;
    
    const meetingsCollection = collection(firestore, 'users', user.uid, 'meetings');
    const newMeetingRef = doc(meetingsCollection);
    
    setDocumentNonBlocking(newMeetingRef, {
      ...data,
      id: newMeetingRef.id,
      dateTime: new Date(data.dateTime).toISOString(),
      isCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, {});

    setIsOpen(false);
    form.reset();
    toast({
      title: "Meeting Added",
      description: `"${data.title}" has been successfully added.`,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Add Meeting
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Add New Meeting</SheetTitle>
          <SheetDescription>
            Fill in the details for your new meeting.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Project Kick-off" {...field} />
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
                    <Input placeholder="e.g., Client Intro" {...field} value={field.value ?? ''} />
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
              <Button type="submit">Add Meeting</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
