import * as Clerk from '@clerk/elements/common';
import * as SignIn from '@clerk/elements/sign-in';
import type { JSX, ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ClerkOAuthConnection } from '@/components/clerk-oauth-connection';
import { cn } from '@/lib/utils';

const fieldClass = 'grid gap-2';
const labelClass = 'text-sm font-medium leading-none text-foreground';
const inputClass = cn(
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
);
const errorTextClass = 'text-sm text-destructive';
const stepTitleClass =
  'mb-1 text-center font-serif text-2xl font-normal tracking-normal text-foreground';
const stepSubtitleClass = 'mb-4 text-center text-sm text-muted-foreground';

function VerificationChrome({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <>
      <h2 className={stepTitleClass}>{title}</h2>
      <Clerk.GlobalError className={cn('mb-3 text-center', errorTextClass)} />
      <div className="flex flex-col gap-4">{children}</div>
    </>
  );
}

/**
 * Sign in with Google, email/password (plus Clerk verification strategies), MFA, and optional passkey.
 * Uses `routing="virtual"` with `path="/"` like other Elements auth surfaces.
 */
export function ClerkElementsSignIn(): JSX.Element {
  return (
    <SignIn.Root
      path="/"
      routing="virtual"
      fallback={
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      }
    >
      <SignIn.Step name="start">
        <h1 className={stepTitleClass}>Sign in</h1>
        <p className={stepSubtitleClass}>
          Continue with Google or sign in with your email.
        </p>
        <Clerk.GlobalError className={cn('mb-3 text-center', errorTextClass)} />
        <div className="flex flex-col gap-2">
          <ClerkOAuthConnection label="Continue with Google" />
        </div>
        <p className="my-3 text-center text-xs text-muted-foreground">or</p>
        <Clerk.Field name="identifier" className={fieldClass}>
          <Clerk.Label className={labelClass}>Email</Clerk.Label>
          <Clerk.Input className={inputClass} type="email" autoComplete="username" />
          <Clerk.FieldError className={errorTextClass} />
        </Clerk.Field>
        <SignIn.Action submit asChild>
          <Button type="submit" size="lg" className="mt-2 w-full">
            Continue
          </Button>
        </SignIn.Action>
      </SignIn.Step>

      <SignIn.Step name="verifications">
        <SignIn.Strategy name="password">
          <VerificationChrome title="Enter your password">
            <Clerk.Field name="password" className={fieldClass}>
              <Clerk.Label className={labelClass}>Password</Clerk.Label>
              <Clerk.Input className={inputClass} type="password" autoComplete="current-password" />
              <Clerk.FieldError className={errorTextClass} />
            </Clerk.Field>
            <SignIn.Action submit asChild>
              <Button type="submit" size="lg" className="w-full">
                Sign in
              </Button>
            </SignIn.Action>
            <SignIn.Action
              navigate="forgot-password"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full text-muted-foreground',
              )}
            >
              Forgot password?
            </SignIn.Action>
          </VerificationChrome>
        </SignIn.Strategy>

        <SignIn.Strategy name="email_code">
          <VerificationChrome title="Check your email">
            <p className="text-center text-sm text-muted-foreground">
              We sent a code to <SignIn.SafeIdentifier />.
            </p>
            <Clerk.Field name="code" className={fieldClass}>
              <Clerk.Label className={labelClass}>Email code</Clerk.Label>
              <Clerk.Input className={inputClass} autoComplete="one-time-code" />
              <Clerk.FieldError className={errorTextClass} />
            </Clerk.Field>
            <SignIn.Action submit asChild>
              <Button type="submit" size="lg" className="w-full">
                Continue
              </Button>
            </SignIn.Action>
          </VerificationChrome>
        </SignIn.Strategy>

        <SignIn.Strategy name="reset_password_email_code">
          <VerificationChrome title="Check your email">
            <p className="text-center text-sm text-muted-foreground">
              We sent a code to <SignIn.SafeIdentifier />.
            </p>
            <Clerk.Field name="code" className={fieldClass}>
              <Clerk.Label className={labelClass}>Email code</Clerk.Label>
              <Clerk.Input className={inputClass} autoComplete="one-time-code" />
              <Clerk.FieldError className={errorTextClass} />
            </Clerk.Field>
            <SignIn.Action submit asChild>
              <Button type="submit" size="lg" className="w-full">
                Continue
              </Button>
            </SignIn.Action>
          </VerificationChrome>
        </SignIn.Strategy>

        <SignIn.FirstFactor>
          <SignIn.Strategy name="passkey">
            <VerificationChrome title="Sign in with passkey">
              <p className="text-center text-sm text-muted-foreground">
                Use your device passkey to finish signing in.
              </p>
              <SignIn.Action submit asChild>
                <Button type="submit" size="lg" className="w-full">
                  Continue with passkey
                </Button>
              </SignIn.Action>
            </VerificationChrome>
          </SignIn.Strategy>
        </SignIn.FirstFactor>

        <SignIn.SecondFactor>
          <SignIn.Strategy name="totp">
            <VerificationChrome title="Authenticator code">
              <Clerk.Field name="code" className={fieldClass}>
                <Clerk.Label className={labelClass}>Code</Clerk.Label>
                <Clerk.Input className={inputClass} />
                <Clerk.FieldError className={errorTextClass} />
              </Clerk.Field>
              <SignIn.Action submit asChild>
                <Button type="submit" size="lg" className="w-full">
                  Continue
                </Button>
              </SignIn.Action>
            </VerificationChrome>
          </SignIn.Strategy>
          <SignIn.Strategy name="backup_code">
            <VerificationChrome title="Backup code">
              <Clerk.Field name="backup_code" className={fieldClass}>
                <Clerk.Label className={labelClass}>Backup code</Clerk.Label>
                <Clerk.Input className={inputClass} />
                <Clerk.FieldError className={errorTextClass} />
              </Clerk.Field>
              <SignIn.Action submit asChild>
                <Button type="submit" size="lg" className="w-full">
                  Continue
                </Button>
              </SignIn.Action>
            </VerificationChrome>
          </SignIn.Strategy>
        </SignIn.SecondFactor>
      </SignIn.Step>

      <SignIn.Step name="forgot-password">
        <h2 className={stepTitleClass}>Forgot your password?</h2>
        <p className={stepSubtitleClass}>
          We&apos;ll email you a link to reset it.
        </p>
        <Clerk.GlobalError className={cn('mb-3 text-center', errorTextClass)} />
        <SignIn.SupportedStrategy
          name="reset_password_email_code"
          className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full')}
        >
          Reset password
        </SignIn.SupportedStrategy>
        <SignIn.Action
          navigate="previous"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'mt-2 w-full text-muted-foreground',
          )}
        >
          Go back
        </SignIn.Action>
      </SignIn.Step>

      <SignIn.Step name="reset-password">
        <h2 className={stepTitleClass}>Reset your password</h2>
        <Clerk.GlobalError className={cn('mb-3 text-center', errorTextClass)} />
        <div className="flex flex-col gap-4">
          <Clerk.Field name="password" className={fieldClass}>
            <Clerk.Label className={labelClass}>New password</Clerk.Label>
            <Clerk.Input className={inputClass} type="password" autoComplete="new-password" />
            <Clerk.FieldError className={errorTextClass} />
          </Clerk.Field>
          <Clerk.Field name="confirmPassword" className={fieldClass}>
            <Clerk.Label className={labelClass}>Confirm password</Clerk.Label>
            <Clerk.Input className={inputClass} type="password" autoComplete="new-password" />
            <Clerk.FieldError className={errorTextClass} />
          </Clerk.Field>
          <SignIn.Action submit asChild>
            <Button type="submit" size="lg" className="w-full">
              Reset password
            </Button>
          </SignIn.Action>
        </div>
      </SignIn.Step>

      <SignIn.Step name="choose-session">
        <h2 className={stepTitleClass}>Choose an account</h2>
        <p className={stepSubtitleClass}>
          Select the session you want to continue with.
        </p>
        <SignIn.SessionList className="flex flex-col gap-2">
          <SignIn.SessionListItem>
            {({ session }) => (
              <SignIn.Action setActiveSession asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-auto w-full justify-start py-3 text-left"
                >
                  <span className="block truncate text-sm font-medium">
                    {session.identifier ?? 'Signed-in account'}
                  </span>
                </Button>
              </SignIn.Action>
            )}
          </SignIn.SessionListItem>
        </SignIn.SessionList>
      </SignIn.Step>

      <SignIn.Step name="sso-callback">
        <SignIn.Captcha className="flex justify-center py-4" />
      </SignIn.Step>
    </SignIn.Root>
  );
}
