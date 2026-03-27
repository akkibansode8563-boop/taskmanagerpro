'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardCheck, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ui/theme-toggle';
import { Button } from '../ui/button';
import { useUser } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';

const AppHeader = () => {
  const { user, isUserLoading } = useUser();
  const auth = getAuth();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut(auth);
  };

  const Logo = () => (
    <Link href={user ? "/dashboard" : "/"} className="mr-6 flex items-center space-x-2">
      <ClipboardCheck className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg bg-gradient-to-r from-sky-600 via-primary to-orange-500 bg-clip-text text-transparent animate-shine bg-[200%_auto]">
        TaskMaster Pro
      </span>
    </Link>
  );

  const navLinkClassName = (href: string) =>
    cn(
      'transition-colors hover:text-foreground/80',
      pathname === href ? 'text-foreground' : 'text-foreground/60'
    );

  if (isUserLoading || !user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center">
            <Logo />
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className={navLinkClassName('/dashboard')}>Dashboard</Link>
            <Link href="/tasks" className={navLinkClassName('/tasks')}>Tasks</Link>
            <Link href="/meetings" className={navLinkClassName('/meetings')}>Meetings</Link>
            <Link href="/calendar" className={navLinkClassName('/calendar')}>Calendar</Link>
          </nav>
        </div>
         <div className="flex flex-1 items-center md:hidden">
            <Logo />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
