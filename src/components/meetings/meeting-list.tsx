"use client";

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, Calendar, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Meeting, type MeetingFilter } from '@/lib/types';
import { isMeetingDone, normalizeMeeting } from '@/lib/workflow';
import { Badge } from '../ui/badge';
import EmptyState from '../shared/empty-state';
import MeetingItem from './meeting-item';

type MeetingSort = 'soonest' | 'latest' | 'recent';

interface MeetingListProps {
  meetings: Meeting[];
  initialFilter: MeetingFilter;
  initialSearch: string;
  isLoading: boolean;
}

const MeetingList: React.FC<MeetingListProps> = ({
  meetings,
  initialFilter,
  initialSearch,
  isLoading,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<MeetingFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<MeetingSort>('soonest');
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, ReturnType<typeof normalizeMeeting>['status']>>({});

  const handleTabChange = (tab: string) => {
    const newTab = tab as MeetingFilter;
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

  const syncedMeetings = useMemo(
    () =>
      meetings.map((meeting) => {
        const optimisticStatus = optimisticStatuses[meeting.id];
        return optimisticStatus
          ? { ...meeting, status: optimisticStatus, isCompleted: optimisticStatus === 'COMPLETED' }
          : meeting;
      }),
    [meetings, optimisticStatuses]
  );

  const filteredMeetings = useMemo(() => {
    return [...syncedMeetings]
      .filter((meeting) => {
        if (activeTab === 'pending') return !isMeetingDone(meeting);
        if (activeTab === 'completed') return isMeetingDone(meeting);
        return true;
      })
      .filter(
        (meeting) =>
          meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          meeting.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
        }
        if (sortBy === 'recent') {
          return b.updatedAt - a.updatedAt;
        }
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });
  }, [syncedMeetings, activeTab, searchQuery, sortBy]);

  const pendingCount = useMemo(() => syncedMeetings.filter((meeting) => !isMeetingDone(meeting)).length, [syncedMeetings]);
  const completedCount = useMemo(() => syncedMeetings.filter((meeting) => isMeetingDone(meeting)).length, [syncedMeetings]);
  const allCount = syncedMeetings.length;
  const resultLabel = `${filteredMeetings.length} ${filteredMeetings.length === 1 ? 'meeting' : 'meetings'} shown`;

  const handleOptimisticStatusChange = (meetingId: string, status: ReturnType<typeof normalizeMeeting>['status']) => {
    setOptimisticStatuses((current) => ({ ...current, [meetingId]: status }));
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

    if (filteredMeetings.length > 0) {
      return (
        <div className="mt-4 space-y-4">
          {filteredMeetings.map((meeting) => (
            <MeetingItem key={meeting.id} meeting={meeting} onStatusChange={handleOptimisticStatusChange} />
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
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full md:max-w-sm"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Badge variant="outline" className="h-10 justify-center px-3 text-sm sm:justify-start">
            {resultLabel}
          </Badge>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as MeetingSort)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowDownUp className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort meetings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soonest">Soonest first</SelectItem>
              <SelectItem value="latest">Latest first</SelectItem>
              <SelectItem value="recent">Recently updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
          <TabsTrigger value="all">
            <div className="flex flex-col items-center gap-1 py-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              All <Badge variant="secondary">{allCount}</Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="pending">
            <div className="flex flex-col items-center gap-1 py-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              Pending <Badge variant="secondary">{pendingCount}</Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="completed">
            <div className="flex flex-col items-center gap-1 py-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              Completed <Badge variant="secondary">{completedCount}</Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderContent()}
          {!isLoading && filteredMeetings.length === 0 && (
            <EmptyState
              Icon={Calendar}
              title="No meetings yet"
              description={searchQuery ? 'No meetings match your search.' : 'Schedule your first meeting to get started.'}
            />
          )}
        </TabsContent>

        <TabsContent value="pending">
          {renderContent()}
          {!isLoading && filteredMeetings.length === 0 && (
            <EmptyState
              Icon={Calendar}
              title="No pending meetings"
              description={searchQuery ? 'No meetings match your search.' : 'No upcoming meetings.'}
            />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {renderContent()}
          {!isLoading && filteredMeetings.length === 0 && (
            <EmptyState
              Icon={CheckCircle2}
              title="No completed meetings"
              description={searchQuery ? 'No meetings match your search.' : 'Complete some meetings to see them here.'}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeetingList;
