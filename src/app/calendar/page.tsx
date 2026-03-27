'use client';

import React from 'react';
import CalendarView from '@/components/dashboard/calendar-view';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import type { Task, Meeting } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarPage() {
  const { firestore, user } = useFirebase();

  const tasksCollection = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'tasks'), orderBy('dueDate', 'asc')) : null),
    [firestore, user]
  );
  const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksCollection);

  const meetingsCollection = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'meetings'), orderBy('dateTime', 'asc')) : null),
    [firestore, user]
  );
  const { data: meetings, isLoading: meetingsLoading } = useCollection<Meeting>(meetingsCollection);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
            A comprehensive overview of your tasks and meetings.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[calc(100vh-20rem)] min-h-[600px]">
          <CalendarView 
            tasks={tasks || []} 
            meetings={meetings || []} 
            isLoading={tasksLoading || meetingsLoading} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
