'use client';

import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const publicRoutes = ['/login', '/signup']; 

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const tasksCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'tasks') : null),
    [firestore, user]
  );
  const { data: tasks } = useCollection<Task>(tasksCollection);

  useEffect(() => {
    if (isUserLoading) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && !isPublicRoute) {
      router.push('/login');
    }

    if (user && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, pathname]);
  
  useEffect(() => {
    const checkReminders = () => {
      if (!tasks || typeof window === 'undefined' || !('Notification' in window)) {
        return;
      }

      if (Notification.permission === 'denied') {
        return;
      }
      
      if (Notification.permission !== 'granted') {
         Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              toast({
                title: 'Notifications Enabled',
                description: 'You will now receive reminders for your tasks.',
              });
            }
         });
      }

      tasks.forEach(task => {
        if (task.reminderTime && !task.isCompleted) {
          const reminderDate = new Date(task.reminderTime);
          const now = new Date();
          
          // Check if reminder is in the past minute
          if (reminderDate <= now && now.getTime() - reminderDate.getTime() < 60000) {
            new Notification('Task Reminder', {
              body: `It's time for: ${task.name}`,
              icon: '/favicon.ico', // Optional: add an icon
            });
          }
        }
      });
    };

    const intervalId = setInterval(checkReminders, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [tasks, toast]);


  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
