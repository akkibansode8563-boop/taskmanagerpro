import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | number | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatTime(date: string | number | Date): string {
  return format(new Date(date), "h:mm a");
}

export function formatDateTime(date: string | number | Date): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatLastUpdated(timestamp: number): string {
    return `${formatDistanceToNow(new Date(timestamp))} ago`;
}
