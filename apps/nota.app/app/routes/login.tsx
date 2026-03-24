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
import { useIsElectron } from '../lib/use-is-electron';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { loginSchema } from '../lib/validation/auth';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const result = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!result.success) {
    const firstError = result.error.errors[0];
    return { error: firstError.message };
  }

  const { email, password } = result.data;
  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  throw redirect('/notes', { headers });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const isElectron = useIsElectron();

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

        {actionData?.error && (
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

          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'h-10 w-full',
            )}
          >
            Sign In
          </button>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className={cn(
              buttonVariants({ variant: 'link', size: 'sm' }),
              'h-auto p-0 text-sm',
            )}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
