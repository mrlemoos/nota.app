import { useState, type FormEvent, type JSX } from 'react';
import { AuthCardEpigraph } from '@/components/auth-card-epigraph';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signupSchema } from '../lib/validation/auth';
import { getBrowserClient } from '../lib/supabase/browser';
import { hashForScreen } from '../lib/app-navigation';

function headingStyle() {
  return { fontFamily: '"Instrument Serif", serif' } as const;
}

export default function Signup(): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    success: true;
    email: string;
  } | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = signupSchema.safeParse({
      email: fd.get('email'),
      password: fd.get('password'),
      confirmPassword: fd.get('confirmPassword'),
    });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Invalid input');
      return;
    }
    const { email, password } = result.data;
    void (async () => {
      const { data, error: signErr } = await getBrowserClient().auth.signUp({
        email,
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      if (data.session) {
        window.location.hash = hashForScreen({
          kind: 'notes',
          panel: 'list',
          noteId: null,
        }).slice(1);
        return;
      }
      setConfirmed({
        success: true,
        email: data.user?.email ?? email,
      });
    })();
  };

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
                {confirmed.email}
              </span>
              . Open the email and follow the link to finish setting up your
              account, then you can sign in.
            </p>
            <a
              href={hashForScreen({ kind: 'login' })}
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'flex h-10 w-full items-center justify-center',
              )}
            >
              Back to sign in
            </a>
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

            {error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
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
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a
                href={hashForScreen({ kind: 'login' })}
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'h-auto p-0 text-sm',
                )}
              >
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
