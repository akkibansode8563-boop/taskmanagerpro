'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { AlertCircle, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabase, ensureProfile } from '@/supabase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthFormProps = React.HTMLAttributes<HTMLDivElement>;

const formSchema = z.object({
  username: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }).optional(),
});

type UserFormValue = z.infer<typeof formSchema>;

/**
 * Returns the URL Supabase should redirect back to after OAuth.
 * Must be added to the Supabase Dashboard → Authentication → Redirect URLs allowlist.
 */
function getAuthRedirectUrl(): string {
  // On the server window is undefined; fall back to the configured app URL.
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl =
    configuredAppUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return new URL('/login', baseUrl).toString();
}

function getAuthErrorDetails(error: unknown): { title: string; description: string } {
  const message = (error as { message?: string })?.message?.toLowerCase() ?? '';

  if (message.includes('user already registered')) {
    return {
      title: 'Email Already In Use',
      description: 'This email already has an account. Try signing in instead.',
    };
  }

  if (message.includes('invalid login credentials')) {
    return {
      title: 'Invalid Credentials',
      description: 'Please check your email and password and try again.',
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      title: 'Email Not Confirmed',
      description: 'Please confirm your email first, then sign in.',
    };
  }

  if (message.includes('provider') || message.includes('oauth') || message.includes('redirect')) {
    return {
      title: 'Google Sign-In Not Configured',
      description:
        'Google sign-in is not enabled in this project yet. Enable the Google provider in the Supabase Dashboard under Authentication → Providers.',
    };
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      title: 'Network Error',
      description: 'Could not reach the authentication service. Check your connection and try again.',
    };
  }

  return {
    title: 'Authentication Error',
    description: (error as { message?: string })?.message || 'An unexpected error occurred. Please try again.',
  };
}

/** Inline Google "G" logo SVG — avoids an extra network request */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthForm({ className, ...props }: AuthFormProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { supabase, isConfigured } = useSupabase();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(searchParams.get('type') === 'signup');
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [authAlert, setAuthAlert] = React.useState<{ title: string; description: string } | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      username: '',
    },
  });

  const onSubmit = async (data: UserFormValue) => {
    setAuthAlert(null);

    if (!isConfigured) {
      setAuthAlert({
        title: 'Supabase Not Configured',
        description: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file before signing in.',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!data.username || data.username.trim().length < 3) {
          setAuthAlert({ title: 'Username Too Short', description: 'Choose a username with at least 3 characters.' });
          return;
        }

        if (!data.password) {
          setAuthAlert({ title: 'Password Required', description: 'A password is required to create an account.' });
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              display_name: data.username.trim(),
            },
          },
        });

        if (error) throw error;
        if (signUpData.user) {
          await ensureProfile(signUpData.user, data.username.trim());
        }

        toast({
          title: 'Account Ready',
          description: 'Your account has been created. If email confirmation is enabled, check your inbox.',
        });
      } else {
        if (!data.password) {
          setAuthAlert({ title: 'Password Required', description: 'Enter your password to sign in.' });
          return;
        }

        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;
        if (signInData.user) {
          await ensureProfile(signInData.user);
        }

        toast({
          title: 'Signed In',
          description: 'Welcome back. Your dashboard is ready.',
        });
      }
    } catch (error) {
      const details = getAuthErrorDetails(error);
      setAuthAlert(details);
      toast({ title: details.title, description: details.description, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async () => {
    setAuthAlert(null);

    if (!isConfigured) {
      setAuthAlert({
        title: 'Supabase Not Configured',
        description: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file before using Google sign-in.',
      });
      return;
    }

    setIsGoogleLoading(true);

    try {
      const redirectTo = getAuthRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            // Request offline access to get a refresh token
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      // On success, browser is redirected to Google — no further action needed here.
    } catch (error) {
      const details = getAuthErrorDetails(error);
      setAuthAlert(details);
      toast({ title: details.title, description: details.description, variant: 'destructive' });
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetError(null);
    setAuthAlert(null);
    const email = getValues('email');

    if (!email) {
      setResetError('Please enter your email address above to reset your password.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl(),
      });
      if (error) throw error;

      toast({
        title: 'Password Reset Sent',
        description: 'Check your inbox for a reset link.',
      });
      setIsForgotPassword(false);
    } catch (error) {
      const details = getAuthErrorDetails(error);
      setResetError(details.description);
    } finally {
      setIsLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className={cn('grid gap-6', className)} {...props}>
        <div className="flex flex-col space-y-2 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
        </div>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">Email</Label>
            <Input id="email" placeholder="name@example.com" type="email" disabled={isLoading} {...register('email')} />
            {errors.email && <p className="px-1 text-xs text-destructive">{errors.email.message}</p>}
            {resetError && <p className="px-1 text-xs text-destructive">{resetError}</p>}
          </div>
          <Button disabled={isLoading} onClick={handleForgotPassword}>Send Reset Link</Button>
        </div>
        <p className="text-center text-sm">
          <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setIsForgotPassword(false)}>
            Back to Login
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      {authAlert && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{authAlert.title}</AlertTitle>
          <AlertDescription>{authAlert.description}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          {isSignUp && (
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Choose a username"
                type="text"
                autoComplete="username"
                disabled={isLoading || isGoogleLoading}
                {...register('username')}
              />
            </div>
          )}
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoComplete="email"
              disabled={isLoading || isGoogleLoading}
              {...register('email')}
            />
            {errors.email && <p className="px-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="Password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              disabled={isLoading || isGoogleLoading}
              {...register('password')}
            />
            {errors.password && <p className="px-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          {!isSignUp && (
            <div className="flex items-center justify-end -mt-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 font-normal"
                onClick={() => setIsForgotPassword(true)}
                disabled={isLoading || isGoogleLoading}
              >
                Forgot Password?
              </Button>
            </div>
          )}
          <Button disabled={isLoading || isGoogleLoading} type="submit">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading || isGoogleLoading}
          onClick={handleSocialSignIn}
          className="gap-2"
        >
          <GoogleIcon className="h-4 w-4" />
          {isGoogleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
        </Button>
      </div>
      <div className="text-center text-sm">
        {isSignUp ? (
          <p>
            Already have an account?{' '}
            <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setIsSignUp(false)}>
              Sign In
            </button>
          </p>
        ) : (
          <p>
            Don&apos;t have an account?{' '}
            <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setIsSignUp(true)}>
              Sign Up
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
