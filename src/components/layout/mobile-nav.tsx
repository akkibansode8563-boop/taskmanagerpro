'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/supabase';

const MobileNav = () => {
    const pathname = usePathname();
    const { user } = useUser();

    if (!user) {
        return null;
    }

    const navItems = [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/tasks', label: 'Tasks', icon: ClipboardList },
        { href: '/meetings', label: 'Meetings', icon: Calendar },
        { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="grid h-16 grid-cols-4 px-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link href={href} key={label} className={cn("flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors", isActive && "bg-primary/10")}>
                            <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            <span className={cn('text-[11px]', isActive ? 'text-primary' : 'text-muted-foreground')}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;
