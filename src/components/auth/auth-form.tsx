'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

const formSchema = z.object({
  username: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password:
    z.string()
    .min(8, { message: 'Password must be at least 8 characters long.' }).optional(),
});

type UserFormValue = z.infer<typeof formSchema>;

export function AuthForm({ className, ...props }: AuthFormProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
  const [isSignUp, setIsSignUp] = React.useState(
    searchParams.get('type') === 'signup'
  );
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);
  
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
        username: ''
    }
  });


  React.useEffect(() => {
    const handleRedirectResult = async () => {
      if (!auth) return;
      try {
        setIsGoogleLoading(true);
        const result = await getRedirectResult(auth);
        if (result) {
          await handleAuthSuccess(result);
        }
      } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          let description = error.message || 'Could not sign in with Google. Please try again.';
          if (error.code === 'auth/unauthorized-domain') {
            description = "This domain isn't authorized for Google Sign-In. Please enable it in your Firebase console.";
          }
          toast({
            title: `Google Sign-In Error`,
            description: description,
            variant: 'destructive',
          });
        }
      } finally {
        setIsGoogleLoading(false);
      }
    };
  
    handleRedirectResult();
  }, [auth, toast]);


  const handleAuthSuccess = async (
    userCredential: UserCredential,
    username?: string,
  ) => {
    const user = userCredential.user;
    if (!user || !firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    
    try {
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const profileData = {
            id: user.uid,
            email: user.email,
            userName: username || user.displayName || user.email?.split('@')[0],
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        };
        if (username) {
          await updateProfile(user, { displayName: username });
        }
        await setDoc(userRef, profileData, { merge: true });
        toast({
          title: 'Account Created',
          description: 'Welcome! Your account has been successfully created.',
        });
      } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        toast({
          title: 'Signed In',
          description: 'Welcome back!',
        });
      }
    } catch (error: any) {
       toast({
        title: 'Firestore Error',
        description: error.message || 'Could not save user profile.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: UserFormValue) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!data.username || data.username.length < 3) {
           toast({
            title: 'Invalid Username',
            description: 'Username must be at least 3 characters long.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        if (!data.password) {
            toast({
                title: 'Password Required',
                description: 'Password is required for sign up.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
        await handleAuthSuccess(userCredential, data.username);
      } else {
         if (!data.password) {
            toast({
                title: 'Password Required',
                description: 'Password is required for sign in.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }
        const userCredential = await signInWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
        await handleAuthSuccess(userCredential);
      }
    } catch (error: any) {
      let title = 'Authentication Error';
      let description = 'An unexpected error occurred. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          title = 'Email Already in Use';
          description = 'This email is already associated with an account. Please sign in instead.';
          break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          title = 'Invalid Credentials';
          description = 'Invalid credentials. Please check your email and password.';
          break;
        default:
          description = error.message || description;
          break;
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
      });

    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSocialSignIn = async (provider: GoogleAuthProvider) => {
    setIsGoogleLoading(true);
    await signInWithRedirect(auth, provider);
  };

  const handleForgotPassword = async () => {
    setResetError(null);
    const email = getValues('email');
    if (!email) {
      setResetError('Please enter your email address to reset your password.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for a link to reset your password.',
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      console.dir(error); // Full error object for debugging
      let message = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'Email not registered.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'Error: Add this domain to the Firebase Console.';
      }
      setResetError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
        <div className={cn('grid gap-6', className)} {...props}>
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Reset Password
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email to receive a reset link.
                </p>
            </div>
            <div className="grid gap-2">
                <div className="grid gap-1">
                    <Label className="sr-only" htmlFor="email">
                    Email
                    </Label>
                    <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...register('email')}
                    />
                    {errors?.email && (
                    <p className="px-1 text-xs text-destructive">
                        {errors.email.message}
                    </p>
                    )}
                    {resetError && (
                      <p className="px-1 text-xs text-destructive">
                          {resetError}
                      </p>
                    )}
                </div>
                <Button disabled={isLoading} onClick={handleForgotPassword}>
                    {isLoading && (
                    <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        />
                        <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    )}
                    Send Reset Link
                </Button>
            </div>
             <p className="text-center text-sm">
                <button
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetError(null);
                }}
                >
                Back to Login
                </button>
            </p>
        </div>
    );
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          {isSignUp && (
             <div className="grid gap-1">
              <Label className="sr-only" htmlFor="username">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Username"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                disabled={isLoading || isGoogleLoading}
                {...register('username')}
              />
              {errors?.username && (
                <p className="px-1 text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>
          )}
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || isGoogleLoading}
              {...register('email')}
            />
            {errors?.email && (
              <p className="px-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              placeholder="Password"
              type="password"
              autoCapitalize="none"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              autoCorrect="off"
              disabled={isLoading || isGoogleLoading}
              {...register('password')}
            />
            {errors?.password && (
              <p className="px-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
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
            {(isLoading || isGoogleLoading) && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isSignUp ? 'Sign Up with Email' : 'Sign In with Email'}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading || isGoogleLoading}
          onClick={() => handleSocialSignIn(new GoogleAuthProvider())}
        >
          {isGoogleLoading ? (
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="mr-2 h-4 w-4" role="img" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
          )}{' '}
          Google
        </Button>
      </div>

      <div className="text-center text-sm">
        {isSignUp ? (
          <p>
            Already have an account?{' '}
            <button
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setIsSignUp(false)}
            >
              Sign In
            </button>
          </p>
        ) : (
          <p>
            Don't have an account?{' '}
            <button
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
