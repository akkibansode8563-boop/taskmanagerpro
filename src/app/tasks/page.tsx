'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TaskList from '@/components/tasks/task-list';
import type { TaskFilter } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTaskSheet } from '@/components/tasks/add-task-sheet';
import { useTasks } from '@/supabase';

function TasksPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') ?? 'pending') as TaskFilter;
  const initialSearch = searchParams.get('search') ?? '';
  const { data: tasks, isLoading } = useTasks('updated');
  
  return (
      <TaskList
        tasks={tasks || []}
        initialFilter={initialFilter}
        initialSearch={initialSearch}
        isLoading={isLoading}
      />
  );
}


export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-4 md:px-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h2>
          <p className="text-muted-foreground">
            Here&apos;s a list of your tasks.
          </p>
        </div>
        <div className="flex items-center">
            <AddTaskSheet />
        </div>
      </div>
      <Suspense fallback={<TaskListSkeleton />}>
        <TasksPageContent />
      </Suspense>
    </div>
  );
}

const TaskListSkeleton = () => (
  <div className="space-y-4">
    <div className="flex space-x-4">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-10 w-1/2" />
    </div>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);
