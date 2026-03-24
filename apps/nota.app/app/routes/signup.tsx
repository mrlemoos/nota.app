import {
  Form,
  Link,
  redirect,
  useActionData,
  type ActionFunctionArgs,
} from 'react-router';
import { AuthCardEpigraph } from '@/components/auth-card-epigraph';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { useIsElectron } from '../lib/use-is-electron';
import { signupSchema } from '../lib/validation/auth';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const result = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!result.success) {
    const firstError = result.error.errors[0];
    return { error: firstError.message };
  }

  const { email, password } = result.data;
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    throw redirect('/notes', { headers });
  }

  return {
    success: true as const,
    email: data.user?.email ?? email,
  };
}

function headingStyle() {
  return { fontFamily: '"Instrument Serif", serif' } as const;
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const confirmed =
    actionData && 'success' in actionData && actionData.success === true;

  return (
    <main
      id="main-content"
      className={cn(
        'relative isolate flex min-h-dvh items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]',
      )}
    >
      <div className="absolute inset-0 z-0">
        <CartoonLandscape className="size-full" />
      </div>

      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl border border-border/50 bg-background/70 p-8 shadow-lg backdrop-blur-xl ring-1 ring-border/40',
        )}
      >
        {confirmed ? (
          <>
            <h1
              className="mb-3 text-balance text-center text-2xl font-normal leading-tight text-foreground"
              style={headingStyle()}
            >
              Check your inbox
            </h1>
            <p className="mb-6 text-pretty text-center text-sm text-muted-foreground">
              We sent a confirmation link to{' '}
              <span className="font-medium text-foreground">
                {actionData.email}
              </span>
              . Open the email and follow the link to finish setting up your
              account, then you can sign in.
            </p>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'flex h-10 w-full items-center justify-center',
              )}
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <AuthCardEpigraph />
            <h1
              className="mb-6 text-balance text-center text-2xl font-normal leading-tight text-foreground"
              style={headingStyle()}
            >
              Create Account
            </h1>

            {actionData && 'error' in actionData && actionData.error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {actionData.error}
              </div>
            )}

            <Form method="post" className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-10 w-full',
                )}
              >
                Create Account
              </button>
            </Form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'h-auto p-0 text-sm',
                )}
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
