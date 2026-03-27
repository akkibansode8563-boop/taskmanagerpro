
'use client';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type TaskPriority } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Plus, Bell } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { format, parse } from 'date-fns';

const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  details: z.string().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
  enableReminder: z.boolean(),
  reminderTime: z.string().nullable(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export const AddTaskSheet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      details: '',
      dueDate: '',
      enableReminder: false,
      reminderTime: '',
      priority: 'MEDIUM',
    },
  });
  
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');

    const taskRegex = /Task: (.*?)\n/;
    const detailsRegex = /Details: (.*?)\n/;
    const dueRegex = /Due: (.*?)\n/;
    const createdByRegex = /Created by: (.*?)\n/;

    const taskMatch = pastedText.match(taskRegex);
    const detailsMatch = pastedText.match(detailsRegex);
    const dueMatch = pastedText.match(dueRegex);
    const createdByMatch = pastedText.match(createdByRegex);

    if (taskMatch && dueMatch) {
      let taskName = taskMatch[1].trim();
      const details = detailsMatch ? detailsMatch[1].trim() : null;
      const dueDateStr = dueMatch[1].trim();
      const createdBy = createdByMatch ? createdByMatch[1].trim() : null;
      
      if (createdBy) {
        taskName = `${taskName} (Created by - ${createdBy})`;
      }

      // Try to parse 'MMM d, yyyy' format
      try {
        const parsedDate = parse(dueDateStr, 'MMM d, yyyy', new Date());
        if (!isNaN(parsedDate.getTime())) {
          const formattedDate = format(parsedDate, 'yyyy-MM-dd');
          form.setValue('dueDate', formattedDate);
        }
      } catch (e) {
          console.error("Could not parse date from pasted text:", e);
      }
      
      form.setValue('name', taskName);
      if(details) form.setValue('details', details);

      toast({
        title: "Shared Task Detected",
        description: "We've auto-filled the form from your pasted text.",
      });
    } else {
        // Fallback to just pasting the text into the name field
        form.setValue('name', pastedText);
    }
  };

  const onSubmit = (data: TaskFormValues) => {
    if (!user) return;
    
    let reminderDateTime = null;
    if (data.enableReminder && data.dueDate && data.reminderTime) {
        try {
            reminderDateTime = new Date(`${data.dueDate}T${data.reminderTime}:00`).toISOString();
        } catch (e) {
            console.error("Invalid date/time for reminder");
        }
    }


    const tasksCollection = collection(firestore, 'users', user.uid, 'tasks');
    const newTaskRef = doc(tasksCollection);

    setDocumentNonBlocking(newTaskRef, {
      id: newTaskRef.id,
      name: data.name,
      details: data.details,
      dueDate: new Date(data.dueDate).toISOString(),
      reminderTime: reminderDateTime,
      priority: data.priority,
      isCompleted: false,
      wasCarriedForward: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, {});

    setIsOpen(false);
    form.reset();
    toast({
      title: 'Task Added',
      description: `"${data.name}" has been successfully added.`,
    });
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
      <SheetContent className="w-full sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Add New Task</SheetTitle>
          <SheetDescription>
            Fill in the details for your new task. Click add when you're done.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-6"
          >
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
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Review financial data and compile the final report."
                      {...field}
                      value={field.value ?? ''}
                    />
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
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4" />
                    <Label htmlFor="reminder-switch">Remind Me</Label>
                    <FormField
                        control={form.control}
                        name="enableReminder"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                   <Switch
                                        id="reminder-switch"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
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
                          <Input
                            type="time"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
            </div>
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map(
                        (priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
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
