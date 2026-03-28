'use client';

import React from 'react';
import CalendarView from '@/components/dashboard/calendar-view';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMeetings, useTasks } from '@/supabase';

export default function CalendarPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks('due');
  const { data: meetings, isLoading: meetingsLoading } = useMeetings('scheduled');

  return (
    <div className="container mx-auto space-y-6 px-4 py-4 md:px-6 md:py-8">
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
            A comprehensive overview of your tasks and meetings.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[calc(100dvh-17rem)] min-h-[420px] px-2 pb-2 sm:px-4 sm:pb-4 md:min-h-[600px]">
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
