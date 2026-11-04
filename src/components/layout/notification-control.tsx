'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Settings2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  getNotificationPermissionStatus,
  isSoundEnabled,
  requestNotificationPermission,
  setSoundEnabled,
  type PermissionStatus,
} from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

export function NotificationControl() {
  const [permission, setPermission] = useState<PermissionStatus>('default');
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());
    setSoundOn(isSoundEnabled());
  }, []);

  const handleRequestPermission = async () => {
    const nextStatus = await requestNotificationPermission();
    setPermission(nextStatus);

    if (nextStatus === 'granted') {
      toast({
        title: 'Notifications enabled!',
        description: 'You will receive reminders and task alerts even when in the background.',
      });
    } else if (nextStatus === 'denied') {
      toast({
        title: 'Notifications blocked by browser',
        description:
          'Click the lock/tune icon near your browser address bar and toggle Notifications to "Allow", then reload the page.',
        variant: 'destructive',
      });
    }
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundOn(checked);
    setSoundEnabled(checked);
    toast({
      title: checked ? 'Alert chime enabled' : 'Alert chime silenced',
      description: checked
        ? 'High priority tasks will chime when reminded.'
        : 'High priority tasks will notify silently.',
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 cursor-pointer"
          aria-label="Notification settings"
          title={
            permission === 'granted'
              ? 'Notifications active'
              : permission === 'denied'
              ? 'Notifications blocked by browser'
              : 'Enable reminders'
          }
        >
          {permission === 'granted' ? (
            <BellRing className="h-4 w-4 text-primary" />
          ) : permission === 'denied' ? (
            <BellOff className="h-4 w-4 text-destructive" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}

          {permission === 'default' && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Notification Settings</span>
          </div>
          <span
            className={
              permission === 'granted'
                ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                : permission === 'denied'
                ? 'text-xs font-medium text-destructive'
                : 'text-xs font-medium text-amber-600 dark:text-amber-400'
            }
          >
            {permission === 'granted'
              ? 'Enabled'
              : permission === 'denied'
              ? 'Blocked'
              : 'Not Enabled'}
          </span>
        </div>

        {permission === 'default' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enable notifications to get task reminders and sync alerts in the background.
            </p>
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5 text-xs cursor-pointer"
              onClick={handleRequestPermission}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Enable Notifications</span>
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive space-y-1">
            <p className="font-semibold">Browser permissions blocked</p>
            <p className="text-[11px] leading-relaxed text-destructive/90">
              To allow alerts: click the lock icon in your browser URL bar, change Notifications to Allow, and reload.
            </p>
          </div>
        )}

        {permission === 'granted' && (
          <p className="text-xs text-muted-foreground">
            Desktop alerts are active. You will be notified even when the tab is backgrounded.
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {soundOn ? (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="sound-toggle" className="text-xs cursor-pointer">
              High Priority Sound
            </Label>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundOn}
            onCheckedChange={handleSoundToggle}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
