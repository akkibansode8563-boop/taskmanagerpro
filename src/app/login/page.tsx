import Image from 'next/image';
import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-md rounded-[28px] border bg-card/95 p-5 shadow-xl backdrop-blur sm:p-6 md:p-8">
        <div className="mb-6 flex flex-col items-center space-y-4 text-center">
          <div className="flex w-full max-w-[280px] items-center justify-center gap-3 rounded-[28px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.55)]">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200/80 sm:h-16 sm:w-16">
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
              <p className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">TaskMaster Pro</p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Sign in with your credentials to open your workspace.
            </p>
          </div>
          <p className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Mobile-friendly sign in for Android and iPhone users
          </p>
        </div>
        <AuthForm />
        <p className="mt-6 px-2 text-center text-xs leading-6 text-muted-foreground sm:px-4 sm:text-sm">
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
