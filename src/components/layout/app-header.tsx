'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLogoIcon } from '../icons/app-logo-icon';
import { ThemeToggle } from '../ui/theme-toggle';
import { SyncStatusIndicator } from './sync-status-indicator';
import { NotificationControl } from './notification-control';
import { cn } from '@/lib/utils';

function AppLogo({ href }: { href: string }) {
  return (
    <Link href={href} className="mr-4 flex min-w-0 items-center space-x-2 md:mr-6">
      <AppLogoIcon className="h-5 w-5 shrink-0 md:h-6 md:w-6" />
      <span className="truncate bg-gradient-to-r from-sky-600 via-primary to-orange-500 bg-[200%_auto] bg-clip-text text-base font-bold text-transparent animate-shine md:text-lg">
        TaskMaster Pro
      </span>
    </Link>
  );
}

const AppHeader = () => {
  const pathname = usePathname();

  const navLinkClassName = (href: string) =>
    cn('transition-colors hover:text-foreground/80', pathname === href ? 'text-foreground' : 'text-foreground/60');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-2 px-4 md:px-6">
        <div className="mr-4 hidden md:flex">
          <AppLogo href="/dashboard" />
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className={navLinkClassName('/dashboard')}>Dashboard</Link>
            <Link href="/tasks" className={navLinkClassName('/tasks')}>Tasks</Link>
            <Link href="/meetings" className={navLinkClassName('/meetings')}>Meetings</Link>
            <Link href="/calendar" className={navLinkClassName('/calendar')}>Calendar</Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-1 items-center md:hidden">
          <AppLogo href="/dashboard" />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <SyncStatusIndicator />
          <NotificationControl />
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium">Workspace</p>
            <p className="text-xs text-muted-foreground">All Devices Synced</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
