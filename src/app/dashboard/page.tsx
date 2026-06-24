'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Flame } from 'lucide-react';
import Greeting from '@/components/dashboard/greeting';
import Stats from '@/components/dashboard/stats';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDisplayName } from '@/lib/profile';
import { formatDate, formatDateTime } from '@/lib/utils';
import { getProductivityInsights } from '@/lib/productivity';
import { AnalyticsOverview } from '@/components/dashboard/analytics-overview';
import { useMeetings, useProfile, useTasks, useUser } from '@/supabase';

export default function DashboardPage() {
  const { user } = useUser();
  const { data: profile } = useProfile();
  const { data: tasks, isLoading: tasksLoading } = useTasks('updated');
  const { data: meetings, isLoading: meetingsLoading } = useMeetings('updated');

  const insights = useMemo(
    () => getProductivityInsights(tasks ?? [], meetings ?? []),
    [tasks, meetings]
  );
  const isLoading = tasksLoading || meetingsLoading;

  return (
    <div className="container mx-auto space-y-6 px-4 py-4 sm:space-y-8 md:px-6 md:py-8">
      <Greeting userName={getDisplayName(user, profile)} />

      <Stats
        stats={{
          pendingTasks: insights.pendingTasks,
          completedTasks: insights.completedTasks,
          pendingMeetings: insights.pendingMeetings,
          completedMeetings: insights.completedMeetings,
          totalEvents: insights.totalEvents,
          overdueTasks: insights.overdueTasks,
          todayItems: insights.todayItems.length,
          completionRate: insights.completionRate,
        }}
        isLoading={isLoading}
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Weekly Focus
            </CardTitle>
            <CardDescription>
              Your next actions across tasks and meetings for the coming 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading your focus plan...</div>
            ) : insights.upcomingItems.length > 0 ? (
              insights.upcomingItems.slice(0, 6).map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.kind === 'task' ? 'secondary' : 'outline'}>
                        {item.kind === 'task' ? 'Task' : 'Meeting'}
                      </Badge>
                      {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                      {item.isToday && (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                          Today
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{item.title}</p>
                    {item.details && <p className="text-sm text-muted-foreground">{item.details}</p>}
                  </div>
                  <div className="text-sm text-muted-foreground sm:whitespace-nowrap sm:text-right">
                    {item.kind === 'task' ? formatDate(item.date) : formatDateTime(item.date)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No upcoming items yet. Add a task or meeting to start building your weekly plan.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-rose-200/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Attention Needed
              </CardTitle>
              <CardDescription>
                Overdue work and today&apos;s commitments that need quick follow-through.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-rose-50 p-4 dark:bg-rose-950/30">
                  <div className="text-sm text-muted-foreground">Overdue tasks</div>
                  <div className="text-2xl font-semibold">{isLoading ? '--' : insights.overdueTasks}</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
                  <div className="text-sm text-muted-foreground">Due today</div>
                  <div className="text-2xl font-semibold">
                    {isLoading ? '--' : insights.tasksDueToday + insights.meetingsToday}
                  </div>
                </div>
              </div>
              {!isLoading && insights.overdueItems.length > 0 ? (
                insights.overdueItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-xl border border-dashed p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="destructive">Overdue</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.date)}</p>
                  </div>
                ))
              ) : (
                !isLoading && (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Nothing overdue right now. Nice momentum.
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Momentum Snapshot
              </CardTitle>
              <CardDescription>
                A quick read on pace, priority load, and progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Overall completion rate</span>
                  <span className="text-xl font-semibold">
                    {isLoading ? '--' : `${insights.completionRate}%`}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-rose-500" />
                    High priority open
                  </span>
                  <span className="font-medium">{isLoading ? '--' : insights.priorityBreakdown.HIGH}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-blue-500" />
                    Meetings today
                  </span>
                  <span className="font-medium">{isLoading ? '--' : insights.meetingsToday}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Completed items
                  </span>
                  <span className="font-medium">
                    {isLoading ? '--' : insights.completedTasks + insights.completedMeetings}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnalyticsOverview insights={insights} isLoading={isLoading} />
    </div>
  );
}
