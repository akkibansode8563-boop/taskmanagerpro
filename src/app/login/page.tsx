import { AuthForm } from "@/components/auth/auth-form";
import { ClipboardCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="container relative flex min-h-[calc(100vh-theme(spacing.24))] flex-col items-center justify-center md:min-h-[calc(100vh-theme(spacing.16))]">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to TaskMaster Pro
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to sign in or create your account
          </p>
        </div>
        <AuthForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <a
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
