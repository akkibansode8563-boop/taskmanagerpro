"use client";

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Bell } from 'lucide-react';
import { type Task, type TaskPriority, type TaskStatus } from '@/lib/types';
import { normalizeTask } from '@/lib/workflow';
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

interface EditTaskSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task;
  onSuccess: () => void;
}

const taskStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
const priorities: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

const EditTaskSheet: React.FC<EditTaskSheetProps> = ({ isOpen, setIsOpen, task, onSuccess }) => {
  const { firestore, user } = useFirebase();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    if (isOpen && task) {
      const normalizedTask = normalizeTask(task);
      setEditingTask(normalizedTask);
      form.reset({
        name: normalizedTask.name,
        details: normalizedTask.details || '',
        category: normalizedTask.category || '',
        dueDate: format(new Date(normalizedTask.dueDate), 'yyyy-MM-dd'),
        enableReminder: !!normalizedTask.reminderTime,
        reminderTime: normalizedTask.reminderTime ? format(new Date(normalizedTask.reminderTime), 'HH:mm') : '',
        priority: normalizedTask.priority,
        status: normalizedTask.status,
      });
    }
  }, [form, isOpen, task]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!user || !editingTask) return;

    let reminderDateTime = null;
    if (data.enableReminder && data.dueDate && data.reminderTime) {
      try {
        reminderDateTime = new Date(`${data.dueDate}T${data.reminderTime}:00`).toISOString();
      } catch {
        reminderDateTime = null;
      }
    }

    const taskRef = doc(firestore, 'users', user.uid, 'tasks', editingTask.id);
    await updateDoc(taskRef, {
      name: data.name,
      details: data.details,
      category: data.category || null,
      dueDate: new Date(data.dueDate).toISOString(),
      reminderTime: reminderDateTime,
      priority: data.priority,
      status: data.status,
      isCompleted: data.status === 'COMPLETED',
      updatedAt: serverTimestamp(),
    });

    onSuccess();
  };

  const watchEnableReminder = form.watch('enableReminder');

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
          <SheetDescription>
            Update delivery details, status, and reminder timing without leaving the list.
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
                  <Label htmlFor="reminder-switch-edit">Remind Me</Label>
                  <FormField
                    control={form.control}
                    name="enableReminder"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch id="reminder-switch-edit" checked={field.value} onCheckedChange={field.onChange} />
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
