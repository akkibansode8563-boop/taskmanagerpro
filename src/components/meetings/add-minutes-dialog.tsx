
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
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { type Meeting } from '@/lib/types';

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
  const { firestore, user } = useFirebase();
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

  const onSubmit = (data: MinutesFormValues) => {
    if (!user) return;

    const meetingRef = doc(firestore, 'users', user.uid, 'meetings', meeting.id);
    
    updateDocumentNonBlocking(meetingRef, {
      minutes: data.minutes,
      updatedAt: serverTimestamp(),
    });

    onSuccess();
    toast({
      title: 'Minutes Saved',
      description: `The minutes for "${meeting.title}" have been updated.`,
    });
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

    
