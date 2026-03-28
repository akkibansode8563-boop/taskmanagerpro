'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CalendarDays, ClipboardList, Home } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { useUser } from '@/supabase';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/meetings', label: 'Meetings', icon: Calendar },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

const MobileNav = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const navRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (!user || !navRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        itemRefs.current.filter(Boolean),
        { y: 22, opacity: 0, scale: 0.92 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: 'power3.out',
        }
      );
    }, navRef);

    return () => ctx.revert();
  }, [user]);

  useEffect(() => {
    const activeIndex = navItems.findIndex(({ href }) => pathname === href);
    const activeItem = itemRefs.current[activeIndex];

    if (!navRef.current || !indicatorRef.current || !activeItem) return;

    const navBounds = navRef.current.getBoundingClientRect();
    const itemBounds = activeItem.getBoundingClientRect();

    gsap.to(indicatorRef.current, {
      x: itemBounds.left - navBounds.left,
      width: itemBounds.width,
      duration: 0.45,
      ease: 'power3.out',
    });

    gsap.fromTo(
      activeItem,
      { y: 0 },
      {
        y: -4,
        duration: 0.22,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      }
    );
  }, [pathname]);

  if (!user) {
    return null;
  }

  const handlePress = (index: number) => {
    const target = itemRefs.current[index];
    if (!target) return;

    gsap.fromTo(target, { scale: 0.96 }, { scale: 1, duration: 0.28, ease: 'power2.out' });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
      <div
        ref={navRef}
        className="relative mx-auto grid h-[72px] max-w-md grid-cols-4 rounded-[28px] border border-white/10 bg-background/90 p-2 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.8)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
      >
        <div
          ref={indicatorRef}
          className="absolute bottom-2 left-0 top-2 z-0 rounded-[20px] bg-primary/12 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.15)]"
          style={{ width: '25%' }}
        />
        {navItems.map(({ href, label, icon: Icon }, index) => {
          const isActive = pathname === href;

          return (
            <Link
              href={href}
              key={label}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              onClick={() => handlePress(index)}
              className="relative z-10 flex flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] font-medium"
            >
              <Icon className={cn('h-5 w-5 transition-colors duration-300', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[11px] transition-colors duration-300', isActive ? 'text-primary' : 'text-muted-foreground')}>
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
