import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            TaskMaster Pro helps you manage tasks, meetings, and related workspace data. By using the app, you agree to use it responsibly and only with data you are allowed to manage.
          </p>
          <p>
            You are responsible for the accuracy of the information you create, edit, or share through the app. Access may be limited, suspended, or updated as the product evolves.
          </p>
          <p>
            The service is provided as-is. For team or production use, you should review your own operational, privacy, and compliance requirements before storing sensitive information.
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
