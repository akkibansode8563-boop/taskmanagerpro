import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Target,
} from 'lucide-react';
import AnimatedCounter from './animated-counter';
import { Skeleton } from '../ui/skeleton';

interface StatsProps {
  stats: {
    pendingTasks: number;
    completedTasks: number;
    pendingMeetings: number;
    completedMeetings: number;
    totalEvents: number;
    overdueTasks: number;
    todayItems: number;
    completionRate: number;
  };
  isLoading: boolean;
}

const StatCard = ({ title, value, icon, href, colorClass, animationDelay }: { title: string, value: React.ReactNode, icon: React.ReactNode, href?: string, colorClass: string, animationDelay: string }) => {
  const cardContent = (
    <Card className="hover:border-primary/50 hover:shadow-lg transition-shadow duration-300 h-full animate-fade-in-up" style={{ animationDelay }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={colorClass}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="w-full h-full">{cardContent}</Link> : <div className="w-full h-full">{cardContent}</div>;
};


const Stats: React.FC<StatsProps> = ({ stats, isLoading }) => {
  const renderValue = (value: number) => {
    if (isLoading) return <Skeleton className="h-8 w-1/2" />;
    return <AnimatedCounter endValue={value} />;
  };

  const renderRate = (value: number) => {
    if (isLoading) return <Skeleton className="h-8 w-1/2" />;
    return <span>{value}%</span>;
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Pending Tasks"
          value={renderValue(stats.pendingTasks)}
          icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          href="/tasks?filter=pending"
          colorClass="text-orange-500"
          animationDelay="0s"
        />
        <StatCard
          title="Completed Tasks"
          value={renderValue(stats.completedTasks)}
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          href="/tasks?filter=completed"
          colorClass="text-green-500"
          animationDelay="0.1s"
        />
        <StatCard
          title="Pending Meetings"
          value={renderValue(stats.pendingMeetings)}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          href="/meetings?filter=pending"
          colorClass="text-blue-500"
          animationDelay="0.2s"
        />
        <StatCard
          title="Completed Meetings"
          value={renderValue(stats.completedMeetings)}
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          href="/meetings?filter=completed"
          colorClass="text-purple-500"
          animationDelay="0.3s"
        />
        <StatCard
          title="Overdue Tasks"
          value={renderValue(stats.overdueTasks)}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          href="/tasks?filter=all"
          colorClass="text-rose-500"
          animationDelay="0.4s"
        />
        <StatCard
          title="Today's Agenda"
          value={renderValue(stats.todayItems)}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          href="/calendar"
          colorClass="text-indigo-500"
          animationDelay="0.5s"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          title="Completion Rate"
          value={renderRate(stats.completionRate)}
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          colorClass="text-emerald-500"
          animationDelay="0.6s"
        />
        <StatCard
            title="Calendar View"
            value={isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-muted-foreground text-sm pt-2">View All Events</div>}
            icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
            href="/calendar"
            colorClass="text-indigo-500"
            animationDelay="0.7s"
          />
      </div>
    </div>
  );
};

export default Stats;
