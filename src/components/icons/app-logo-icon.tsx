import React from 'react';
import { cn } from '@/lib/utils';

interface AppLogoIconProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'gradient' | 'monochrome' | 'image';
  className?: string;
}

export function AppLogoIcon({ variant = 'gradient', className, ...props }: AppLogoIconProps) {
  if (variant === 'image') {
    return (
      <div 
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-white p-0.5 border border-slate-200/80 shadow-sm shrink-0", 
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dcc-logo-back.png"
          alt="DCC Logo"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const color = variant === 'monochrome' ? 'currentColor' : 'url(#dcc-logo-grad)';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn('w-6 h-6 select-none', className)}
      {...props}
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id="dcc-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#db2777" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
      )}
      {/* Outer thick circle */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke={color}
        strokeWidth="6"
      />
      {/* Orbit path (rotated ellipse) */}
      <ellipse
        cx="49"
        cy="52"
        rx="36"
        ry="13"
        fill="none"
        stroke={color}
        strokeWidth="2"
        transform="rotate(-33 49 52)"
      />
      {/* Orbit dots/nodes */}
      <circle cx="21" cy="65.5" r="4.2" fill={color} />
      <circle cx="59.5" cy="31.5" r="4.2" fill={color} />
      {/* DCC Text */}
      <text
        x="47"
        y="58"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="28"
        textAnchor="middle"
        letterSpacing="-0.5px"
        fill={color}
      >
        DCC
      </text>
      {/* Since: 1992 Text */}
      <text
        x="49.5"
        y="68.5"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="8"
        fill={color}
      >
        Since: 1992
      </text>
      {/* Trademark symbol ® */}
      <text
        x="80"
        y="34"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="bold"
        fontSize="7"
        fill={color}
      >
        ®
      </text>
    </svg>
  );
}

