"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus } from 'lucide-react';
import { type MeetingStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createMeetingRecord, useUser } from '@/supabase';
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
  SheetTrigger,
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

const meetingStatuses: MeetingStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const AddMeetingSheet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      location: '',
      attendees: '',
      dateTime: '',
      status: 'SCHEDULED',
    },
  });

  const onSubmit = async (data: MeetingFormValues) => {
    if (!user) return;
    try {
      await createMeetingRecord(user, {
        title: data.title,
        subtitle: data.subtitle || null,
        location: data.location || null,
        attendees: data.attendees || null,
        dateTime: new Date(data.dateTime).toISOString(),
        status: data.status,
      });

      setIsOpen(false);
      form.reset();
      toast({
        title: 'Meeting Added',
        description: `"${data.title}" has been successfully added.`,
      });
    } catch (error) {
      toast({
        title: 'Could not add meeting',
        description: (error as { message?: string })?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Add Meeting
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Add New Meeting</SheetTitle>
          <SheetDescription>
            Schedule meetings with location, participants, and lifecycle status from the start.
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
                  <FormLabel>Agenda or Subtitle</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Client intro and timeline review" {...field} value={field.value ?? ''} />
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
                    <Input placeholder="e.g., Akshay, Product Team, Client POC" {...field} value={field.value ?? ''} />
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
