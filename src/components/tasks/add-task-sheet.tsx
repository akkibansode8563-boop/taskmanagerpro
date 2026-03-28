'use client';

import React, { useState } from 'react';
import { format, parse } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bell, Plus } from 'lucide-react';
import { type TaskPriority, type TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createTaskRecord, useUser } from '@/supabase';
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
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  details: z.string().nullable(),
  category: z.string().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
  enableReminder: z.boolean(),
  reminderTime: z.string().nullable(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const taskStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
const priorities: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const AddTaskSheet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      details: '',
      category: '',
      dueDate: '',
      enableReminder: false,
      reminderTime: '',
      priority: 'MEDIUM',
      status: 'TODO',
    },
  });

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');

    const getField = (label: string) => {
      const match = pastedText.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
      return match ? match[1].trim() : null;
    };

    const taskNameValue = getField('Task');
    const dueDateValue = getField('Due');

    if (taskNameValue && dueDateValue) {
      let taskName = taskNameValue;
      const details = getField('Details');
      const category = getField('Category');
      const reminder = getField('Reminder');
      const priority = getField('Priority');
      const status = getField('Status');
      const dueDateStr = dueDateValue;
      const createdBy = getField('Created by');

      if (createdBy) {
        taskName = `${taskName} (Created by - ${createdBy})`;
      }

      try {
        const parsedDate = parse(dueDateStr, 'MMM d, yyyy', new Date());
        if (!Number.isNaN(parsedDate.getTime())) {
          form.setValue('dueDate', format(parsedDate, 'yyyy-MM-dd'));
        }
      } catch {
        // Ignore invalid paste dates and keep manual input available.
      }

      form.setValue('name', taskName);
      if (details) form.setValue('details', details);
      if (category) form.setValue('category', category);
      if (priority && ['HIGH', 'MEDIUM', 'LOW'].includes(priority.toUpperCase())) {
        form.setValue('priority', priority.toUpperCase() as TaskPriority);
      }
      if (status) {
        const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
        if (['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'].includes(normalizedStatus)) {
          form.setValue('status', normalizedStatus as TaskStatus);
        }
      }
      if (reminder) {
        const parsedReminder = reminder.match(/(\d{1,2}:\d{2}\s?[APMapm]{2}|\d{2}:\d{2})/);
        if (parsedReminder) {
          try {
            const parsedTime = parse(parsedReminder[1].toUpperCase().replace(/\s+/g, ''), 'h:mma', new Date());
            form.setValue('enableReminder', true);
            form.setValue('reminderTime', format(parsedTime, 'HH:mm'));
          } catch {
            // Keep manual reminder entry available if parsing fails.
          }
        }
      }

      toast({
        title: 'Shared Task Detected',
        description: "We've auto-filled the form from your pasted text.",
      });
    } else {
      form.setValue('name', pastedText);
    }
  };

  const onSubmit = async (data: TaskFormValues) => {
    if (!user) return;

    let reminderDateTime = null;
    if (data.enableReminder && data.dueDate && data.reminderTime) {
      try {
        reminderDateTime = new Date(`${data.dueDate}T${data.reminderTime}:00`).toISOString();
      } catch {
        reminderDateTime = null;
      }
    }

    try {
      await createTaskRecord(user, {
        name: data.name,
        details: data.details,
        category: data.category || null,
        dueDate: new Date(data.dueDate).toISOString(),
        reminderTime: reminderDateTime,
        priority: data.priority,
        status: data.status,
      });

      setIsOpen(false);
      form.reset();
      toast({
        title: 'Task Added',
        description: `"${data.name}" has been successfully added.`,
      });
    } catch (error) {
      toast({
        title: 'Could not add task',
        description: (error as { message?: string })?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const watchEnableReminder = form.watch('enableReminder');

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Add Task
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Add New Task</SheetTitle>
          <SheetDescription>
            Capture work with status, category, priority, and reminder timing from the start.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Finalize Q3 report" {...field} onPaste={handlePaste} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Operations" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add context, dependencies, or acceptance notes." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
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
                        {taskStatuses.map((status) => (
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
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2 rounded-xl border p-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <Label htmlFor="reminder-switch">Remind Me</Label>
                <FormField
                  control={form.control}
                  name="enableReminder"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch id="reminder-switch" checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {watchEnableReminder && (
                <FormField
                  control={form.control}
                  name="reminderTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Task</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
