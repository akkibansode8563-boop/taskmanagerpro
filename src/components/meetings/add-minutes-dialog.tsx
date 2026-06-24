
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles, LoaderCircle } from 'lucide-react';
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
  const [isAiLoading, setIsAiLoading] = React.useState(false);

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

  const handleAiGenerate = async () => {
    const rawNotes = form.getValues('minutes');
    if (!rawNotes || rawNotes.trim() === '') {
      toast({
        title: 'Empty Notes',
        description: 'Please type some raw meeting notes or talking points first, then click generate.',
        variant: 'destructive',
      });
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: meeting.title,
          subtitle: meeting.subtitle,
          notes: rawNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      
      let formattedMinutes = '';
      if (data.summary) {
        formattedMinutes += `## Executive Summary\n${data.summary}\n\n`;
      }
      if (data.decisions && data.decisions.length > 0) {
        formattedMinutes += `## Key Decisions\n${data.decisions.map((d: string) => `- ${d}`).join('\n')}\n\n`;
      }
      if (data.tasks && data.tasks.length > 0) {
        formattedMinutes += `## Suggested Action Items\n${data.tasks.map((t: any) => `- **${t.name}** (${t.priority}): ${t.details} [Due: ${t.dueDate || 'N/A'}]`).join('\n')}\n`;
      }

      if (formattedMinutes) {
        form.setValue('minutes', formattedMinutes);
        toast({
          title: 'Minutes Structured',
          description: 'AI has successfully organized your raw meeting notes.',
        });
      } else {
        toast({
          title: 'AI Processing Complete',
          description: 'The notes are processed but no structured template was generated.',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'AI Generation Failed',
        description: 'Please ensure GEMINI_API_KEY is configured in your environment.',
        variant: 'destructive',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

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
                  <div className="flex items-center justify-between">
                    <FormLabel>Minutes</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-semibold text-primary hover:text-primary/80 gap-1"
                      onClick={handleAiGenerate}
                      disabled={isAiLoading}
                    >
                      {isAiLoading ? (
                        <>
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                          Structuring...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Smart Structurer
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Enter raw meeting notes here, then click 'AI Smart Structurer' to format..."
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


    
