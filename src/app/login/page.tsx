import Image from 'next/image';
import { ArrowRight, CalendarClock, ShieldCheck } from 'lucide-react';
import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  return (
    <div className="container grid min-h-[calc(100vh-theme(spacing.24))] gap-10 py-10 md:min-h-[calc(100vh-theme(spacing.16))] md:grid-cols-[1.05fr_0.95fr] md:items-center">
      <section className="space-y-8">
        <Badge variant="outline" className="rounded-full px-4 py-1 text-sm">
          Studio workflow, upgraded
        </Badge>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]">
              TaskMaster Pro
            </Badge>
            <span className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">Operations command center</span>
          </div>

          <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
            Run tasks, meetings, and your daily execution from one calm workspace.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            Sign in with Google or email to manage priorities, track overdue work, and keep your weekly focus visible at a glance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
            <CalendarClock className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Weekly focus</p>
            <p className="mt-1 text-sm text-muted-foreground">See what needs attention today and what is coming next.</p>
          </div>
          <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Secure sign-in</p>
            <p className="mt-1 text-sm text-muted-foreground">Use Google or email with clearer recovery and session handling.</p>
          </div>
          <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
            <ArrowRight className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Faster follow-through</p>
            <p className="mt-1 text-sm text-muted-foreground">Move from planning to execution without context switching.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md rounded-[28px] border bg-card/95 p-6 shadow-xl backdrop-blur md:p-8">
        <div className="mb-6 flex flex-col items-center space-y-4 text-center">
          <div className="flex w-fit items-center gap-3 rounded-[28px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.55)]">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
              <Image
                src="/dcc-logo-back.png"
                alt="DCC company logo"
                fill
                className="object-contain p-2"
                priority
              />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Powered by DCC</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">TaskMaster Pro</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Sign in to open your dashboard or create a new account in a minute.
          </p>
        </div>
        <AuthForm />
        <p className="mt-6 px-4 text-center text-sm text-muted-foreground">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      </section>
    </div>
  );
}
