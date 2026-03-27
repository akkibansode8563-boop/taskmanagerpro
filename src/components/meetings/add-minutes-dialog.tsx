
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { type Meeting } from '@/lib/types';
import { updateMeetingMinutes, useUser } from '@/supabase';

const minutesSchema = z.object({
  minutes: z.string().min(1, 'Minutes cannot be empty.'),
});

type MinutesFormValues = z.infer<typeof minutesSchema>;

interface AddMinutesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  meeting: Meeting;
  onSuccess: () => void;
}

export const AddMinutesDialog: React.FC<AddMinutesDialogProps> = ({ isOpen, setIsOpen, meeting, onSuccess }) => {
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<MinutesFormValues>({
    resolver: zodResolver(minutesSchema),
    defaultValues: {
      minutes: meeting.minutes || '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({ minutes: meeting.minutes || '' });
    }
  }, [isOpen, meeting, form]);

  const onSubmit = async (data: MinutesFormValues) => {
    if (!user) return;

    try {
      await updateMeetingMinutes(meeting.id, data.minutes);
      onSuccess();
      toast({
        title: 'Minutes Saved',
        description: `The minutes for "${meeting.title}" have been updated.`,
      });
    } catch (error) {
      toast({
        title: 'Could not save minutes',
        description: (error as { message?: string })?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Meeting Minutes: {meeting.title}</DialogTitle>
          <DialogDescription>
            Add or edit the minutes for this completed meeting. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minutes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter meeting notes, action items, and decisions here..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Minutes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

    
