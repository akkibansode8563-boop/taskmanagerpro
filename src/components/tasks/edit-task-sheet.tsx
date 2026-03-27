
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Task, type TaskPriority } from '@/lib/types';
import { format } from 'date-fns';
import { useFirebase } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  details: z.string().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
  enableReminder: z.boolean(),
  reminderTime: z.string().nullable(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task;
  onSuccess: () => void;
}

const EditTaskSheet: React.FC<EditTaskSheetProps> = ({ isOpen, setIsOpen, task, onSuccess }) => {
  const { firestore, user } = useFirebase();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const router = useRouter();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    if (isOpen && task) {
        setEditingTask(task);
        form.reset({
            ...task,
            name: task.name,
            details: task.details || '',
            dueDate: format(new Date(task.dueDate), "yyyy-MM-dd"),
            enableReminder: !!task.reminderTime,
            reminderTime: task.reminderTime ? format(new Date(task.reminderTime), "HH:mm") : '',
        });
    }
  }, [isOpen, task, form]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!user || !editingTask) return;
    
    let reminderDateTime = null;
    if (data.enableReminder && data.dueDate && data.reminderTime) {
        try {
            reminderDateTime = new Date(`${data.dueDate}T${data.reminderTime}:00`).toISOString()
        } catch (e) {
            console.error("Invalid date/time for reminder")
        }
    }

    const taskRef = doc(firestore, 'users', user.uid, 'tasks', editingTask.id);
    await updateDoc(taskRef, { 
      name: data.name,
      details: data.details,
      dueDate: new Date(data.dueDate).toISOString(),
      reminderTime: reminderDateTime,
      priority: data.priority,
      updatedAt: serverTimestamp(),
    });

    onSuccess();
    window.location.reload();
  };

    const watchEnableReminder = form.watch('enableReminder');

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
          <SheetDescription>
            Update the details for your task. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        {editingTask && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Finalize Q3 report" {...field} />
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
                    <Label htmlFor="reminder-switch-edit">Remind Me</Label>
                    <FormField
                        control={form.control}
                        name="enableReminder"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                   <Switch
                                        id="reminder-switch-edit"
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
                          <Input type="time" {...field} value={field.value ?? ''} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map((priority) => (
                            <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

export default EditTaskSheet;
