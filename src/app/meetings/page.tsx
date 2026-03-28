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
    <div className="container mx-auto px-4 py-4 md:px-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Meetings</h2>
          <p className="text-muted-foreground">
            A place to manage your meetings.
          </p>
        </div>
        <div className="flex items-center">
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
