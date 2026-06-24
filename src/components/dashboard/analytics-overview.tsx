'use client';

import React from 'react';
import { CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, CheckCheck, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ProductivityInsights } from '@/lib/productivity';

interface AnalyticsOverviewProps {
  insights: ProductivityInsights;
  isLoading: boolean;
}

const executionChartConfig = {
  created: {
    label: 'Created',
    color: 'hsl(212 92% 45%)',
  },
  completed: {
    label: 'Completed',
    color: 'hsl(155 75% 36%)',
  },
} satisfies ChartConfig;

const taskStatusConfig = {
  TODO: { label: 'To Do', color: 'hsl(215 16% 47%)' },
  IN_PROGRESS: { label: 'In Progress', color: 'hsl(221 83% 53%)' },
  BLOCKED: { label: 'Blocked', color: 'hsl(346 77% 49%)' },
  COMPLETED: { label: 'Completed', color: 'hsl(155 75% 36%)' },
} satisfies ChartConfig;

const meetingStatusConfig = {
  SCHEDULED: { label: 'Scheduled', color: 'hsl(199 89% 48%)' },
  IN_PROGRESS: { label: 'In Progress', color: 'hsl(239 84% 67%)' },
  COMPLETED: { label: 'Completed', color: 'hsl(155 75% 36%)' },
  CANCELLED: { label: 'Cancelled', color: 'hsl(215 16% 47%)' },
} satisfies ChartConfig;

export function AnalyticsOverview({ insights, isLoading }: AnalyticsOverviewProps) {
  const taskStatusData = Object.entries(insights.taskStatusBreakdown).map(([status, value]) => ({
    status,
    value,
    fill: `var(--color-${status})`,
  }));

  const meetingStatusData = Object.entries(insights.meetingStatusBreakdown).map(([status, value]) => ({
    status,
    value,
    fill: `var(--color-${status})`,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Execution Trend
          </CardTitle>
          <CardDescription>
            Created versus completed work across the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <ChartContainer config={executionChartConfig} className="h-[280px] w-full">
              <LineChart data={insights.completionTrend} margin={{ left: 12, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={3} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Task Status Mix
            </CardTitle>
            <CardDescription>
              How active tasks are distributed across the workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[220px] animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <ChartContainer config={taskStatusConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                  <Pie data={taskStatusData} dataKey="value" nameKey="status" innerRadius={46} outerRadius={78} paddingAngle={3} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Meeting Status Mix
            </CardTitle>
            <CardDescription>
              Keep track of what is scheduled, active, finished, or cancelled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[220px] animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <ChartContainer config={meetingStatusConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                  <Pie data={meetingStatusData} dataKey="value" nameKey="status" innerRadius={46} outerRadius={78} paddingAngle={3} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-primary" />
            Operating Notes
          </CardTitle>
          <CardDescription>
            Quick interpretation of the current workload mix.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Blocked tasks</p>
            <p className="mt-2 text-2xl font-semibold">{insights.taskStatusBreakdown.BLOCKED}</p>
            <p className="mt-2 text-sm text-muted-foreground">These need follow-up or dependency clearance.</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Meetings in motion</p>
            <p className="mt-2 text-2xl font-semibold">{insights.meetingStatusBreakdown.IN_PROGRESS}</p>
            <p className="mt-2 text-sm text-muted-foreground">Live meeting work that may need notes or action items.</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">High-priority open tasks</p>
            <p className="mt-2 text-2xl font-semibold">{insights.priorityBreakdown.HIGH}</p>
            <p className="mt-2 text-sm text-muted-foreground">Keep this number under control to protect focus.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
