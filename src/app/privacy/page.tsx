import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            TaskMaster Pro stores account and workspace data needed to provide authentication, task management, meeting tracking, and reminder features.
          </p>
          <p>
            If you sign in with Google, only the profile information required for authentication and account setup is used. Notification permissions are optional and only used for reminder delivery in your browser.
          </p>
          <p>
            You should avoid storing highly sensitive personal, financial, or regulated data unless your Firebase project and deployment environment are configured for that level of protection.
          </p>
          <p>
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Return to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
