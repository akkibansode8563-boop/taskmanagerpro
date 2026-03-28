"use client";

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, CheckCircle2, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Task, type TaskFilter } from '@/lib/types';
import { isTaskDone, normalizeTask } from '@/lib/workflow';
import { Badge } from '../ui/badge';
import EmptyState from '../shared/empty-state';
import TaskItem from './task-item';

type TaskSort = 'due-soon' | 'due-late' | 'priority' | 'recent';

interface TaskListProps {
  tasks: Task[];
  initialFilter: TaskFilter;
  initialSearch: string;
  isLoading: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  initialFilter,
  initialSearch,
  isLoading,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TaskFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<TaskSort>('due-soon');
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, ReturnType<typeof normalizeTask>['status']>>({});

  const handleTabChange = (tab: string) => {
    const newTab = tab as TaskFilter;
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('filter', newTab);
    router.replace(`?${params.toString()}`);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = event.target.value;
    setSearchQuery(newSearch);
    const params = new URLSearchParams(searchParams.toString());

    if (newSearch) {
      params.set('search', newSearch);
    } else {
      params.delete('search');
    }

    router.replace(`?${params.toString()}`);
  };

  const syncedTasks = useMemo(
    () =>
      tasks.map((task) => {
        const optimisticStatus = optimisticStatuses[task.id];
        return optimisticStatus ? { ...task, status: optimisticStatus, isCompleted: optimisticStatus === 'COMPLETED' } : task;
      }),
    [tasks, optimisticStatuses]
  );

  const filteredTasks = useMemo(() => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    return [...syncedTasks]
      .filter((task) => {
        if (activeTab === 'pending') return !isTaskDone(task);
        if (activeTab === 'completed') return isTaskDone(task);
        return true;
      })
      .filter(
        (task) =>
          task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.details?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'due-late') {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sortBy === 'priority') {
          return priorityOrder[normalizeTask(a).priority] - priorityOrder[normalizeTask(b).priority];
        }
        if (sortBy === 'recent') {
          return b.updatedAt - a.updatedAt;
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [syncedTasks, activeTab, searchQuery, sortBy]);

  const pendingCount = useMemo(() => syncedTasks.filter((task) => !isTaskDone(task)).length, [syncedTasks]);
  const completedCount = useMemo(() => syncedTasks.filter((task) => isTaskDone(task)).length, [syncedTasks]);
  const allCount = syncedTasks.length;
  const resultLabel = `${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'} shown`;

  const handleOptimisticStatusChange = (taskId: string, status: ReturnType<typeof normalizeTask>['status']) => {
    setOptimisticStatuses((current) => ({ ...current, [taskId]: status }));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    if (filteredTasks.length > 0) {
      return (
        <div className="mt-4 space-y-4">
          {filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} onStatusChange={handleOptimisticStatusChange} />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-10 px-3 text-sm">
            {resultLabel}
          </Badge>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as TaskSort)}>
            <SelectTrigger className="w-[180px]">
              <ArrowDownUp className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due-soon">Due soon</SelectItem>
              <SelectItem value="due-late">Due later</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="recent">Recently updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            <div className="flex items-center gap-2">
              All <Badge variant="secondary">{allCount}</Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="pending">
            <div className="flex items-center gap-2">
              Pending <Badge variant="secondary">{pendingCount}</Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="completed">
            <div className="flex items-center gap-2">
              Completed <Badge variant="secondary">{completedCount}</Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderContent()}
          {!isLoading && filteredTasks.length === 0 && (
            <EmptyState
              Icon={List}
              title="No tasks yet"
              description={searchQuery ? 'No tasks match your search.' : 'Create your first task to get started.'}
            />
          )}
        </TabsContent>

        <TabsContent value="pending">
          {renderContent()}
          {!isLoading && filteredTasks.length === 0 && (
            <EmptyState
              Icon={List}
              title="No pending tasks"
              description={searchQuery ? 'No tasks match your search.' : 'All caught up!'}
            />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {renderContent()}
          {!isLoading && filteredTasks.length === 0 && (
            <EmptyState
              Icon={CheckCircle2}
              title="No completed tasks"
              description={searchQuery ? 'No tasks match your search.' : 'Complete some tasks to see them here.'}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskList;
