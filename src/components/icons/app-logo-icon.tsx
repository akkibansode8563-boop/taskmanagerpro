import React from 'react';
import { cn } from '@/lib/utils';

export function AppLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn('w-6 h-6 select-none', className)}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      {/* Outer rounded card */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="28"
        fill="white"
        stroke="url(#logo-grad)"
        strokeWidth="7"
        className="dark:fill-slate-950"
      />
      {/* Inner bolt */}
      <path
        d="M58 20 L35 51 L49 51 L42 80 L65 49 L51 49 Z"
        fill="url(#logo-grad)"
      />
    </svg>
  );
}
