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

function getAuthRedirectUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredAppUrl || window.location.origin;
  return new URL('/login', baseUrl).toString();
}

function getAuthErrorDetails(error: unknown) {
  const message = (error as { message?: string })?.message?.toLowerCase() || '';

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

  if (message.includes('network')) {
    return {
      title: 'Network Error',
      description: 'The request could not reach Supabase. Check your connection and try again.',
    };
  }

  return {
    title: 'Authentication Error',
    description: (error as { message?: string })?.message || 'An unexpected error occurred. Please try again.',
  };
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
        description: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before signing in.',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!data.username || data.username.trim().length < 3) {
          setAuthAlert({ title: 'Username Too Short', description: 'Choose a username with at least 3 characters.' });
          setIsLoading(false);
          return;
        }

        if (!data.password) {
          setAuthAlert({ title: 'Password Required', description: 'A password is required to create an account.' });
          setIsLoading(false);
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
          description: 'Your Supabase account has been created. If email confirmation is enabled, check your inbox.',
        });
      } else {
        if (!data.password) {
          setAuthAlert({ title: 'Password Required', description: 'Enter your password to sign in.' });
          setIsLoading(false);
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
      toast({
        title: details.title,
        description: details.description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async () => {
    setAuthAlert(null);

    if (!isConfigured) {
      setAuthAlert({
        title: 'Supabase Not Configured',
        description: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before using Google sign-in.',
      });
      return;
    }

    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) throw error;
    } catch (error) {
      const details = getAuthErrorDetails(error);
      setAuthAlert(details);
      toast({
        title: details.title,
        description: details.description,
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetError(null);
    setAuthAlert(null);
    const email = getValues('email');

    if (!email) {
      setResetError('Please enter your email address to reset your password.');
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
              <Input id="username" placeholder="Username" type="text" disabled={isLoading || isGoogleLoading} {...register('username')} />
            </div>
          )}
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">Email</Label>
            <Input id="email" placeholder="name@example.com" type="email" disabled={isLoading || isGoogleLoading} {...register('email')} />
            {errors.email && <p className="px-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">Password</Label>
            <Input id="password" placeholder="Password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} disabled={isLoading || isGoogleLoading} {...register('password')} />
            {errors.password && <p className="px-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          {!isSignUp && (
            <div className="flex items-center justify-end -mt-2">
              <Button type="button" variant="link" size="sm" className="h-auto p-0 font-normal" onClick={() => setIsForgotPassword(true)} disabled={isLoading || isGoogleLoading}>
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
        <Button variant="outline" type="button" disabled={isLoading || isGoogleLoading} onClick={handleSocialSignIn}>
          Continue with Google
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
