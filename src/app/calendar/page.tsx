'use client';

import React from 'react';
import CalendarView from '@/components/dashboard/calendar-view';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMeetings, useTasks } from '@/supabase';

export default function CalendarPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks('due');
  const { data: meetings, isLoading: meetingsLoading } = useMeetings('scheduled');

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
