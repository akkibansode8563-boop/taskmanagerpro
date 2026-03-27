'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MeetingFilter } from '@/lib/types';
import MeetingList from '@/components/meetings/meeting-list';
import { Skeleton } from '@/components/ui/skeleton';
import { AddMeetingSheet } from '@/components/meetings/add-meeting-sheet';
import { useMeetings } from '@/supabase';

function MeetingsPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') ?? 'pending') as MeetingFilter;
  const initialSearch = searchParams.get('search') ?? '';
  const { data: meetings, isLoading } = useMeetings('updated');

  return (
    <MeetingList
      meetings={meetings || []}
      initialFilter={initialFilter}
      initialSearch={initialSearch}
      isLoading={isLoading}
    />
  );
}

export default function MeetingsPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meetings</h2>
          <p className="text-muted-foreground">
            A place to manage your meetings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <AddMeetingSheet />
        </div>
      </div>
      <Suspense fallback={<MeetingListSkeleton />}>
        <MeetingsPageContent />
      </Suspense>
    </div>
  );
}

const MeetingListSkeleton = () => (
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
