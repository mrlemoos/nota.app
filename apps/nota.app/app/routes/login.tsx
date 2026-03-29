import { useState, type FormEvent, type JSX } from 'react';
import { AuthCardEpigraph } from '@/components/auth-card-epigraph';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loginSchema } from '../lib/validation/auth';
import { getBrowserClient } from '../lib/supabase/browser';
import { hashForScreen } from '../lib/app-navigation';

export default function Login(): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = loginSchema.safeParse({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Invalid input');
      return;
    }
    const { email, password } = result.data;
    void (async () => {
      const { error: signErr } = await getBrowserClient().auth.signInWithPassword(
        { email, password },
      );
      if (signErr) {
        setError(signErr.message);
        return;
      }
      window.location.hash = hashForScreen({
        kind: 'notes',
        panel: 'list',
        noteId: null,
      }).slice(1);
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
        <AuthCardEpigraph />
        <h1
          className="mb-6 text-balance text-center text-2xl font-normal leading-tight text-foreground"
          style={{ fontFamily: '"Instrument Serif", serif' }}
        >
          Sign In
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

          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'h-10 w-full',
            )}
          >
            Sign In
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <a
            href={hashForScreen({ kind: 'signup' })}
            className={cn(
              buttonVariants({ variant: 'link', size: 'sm' }),
              'h-auto p-0 text-sm',
            )}
          >
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
