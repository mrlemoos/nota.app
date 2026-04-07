import * as Clerk from '@clerk/elements/common';
import * as SignUp from '@clerk/elements/sign-up';
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
 * Sign up with Google or email/password (plus email verification when required by Clerk).
 * Optional `continue` step collects profile fields Clerk still requires after OAuth.
 */
export function ClerkElementsSignUp(): JSX.Element {
  return (
    <SignUp.Root
      path="/"
      routing="virtual"
      fallback={
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      }
    >
      <SignUp.Step name="start">
        <h1 className={stepTitleClass}>Create an account</h1>
        <p className={stepSubtitleClass}>
          Continue with Google or create an account with your email.
        </p>
        <Clerk.GlobalError className={cn('mb-3 text-center', errorTextClass)} />
        <div className="flex flex-col gap-2">
          <ClerkOAuthConnection flow="sign-up" label="Continue with Google" />
        </div>
        <p className="my-3 text-center text-xs text-muted-foreground">or</p>
        <div className="flex flex-col gap-4">
          <Clerk.Field name="emailAddress" className={fieldClass}>
            <Clerk.Label className={labelClass}>Email</Clerk.Label>
            <Clerk.Input className={inputClass} type="email" autoComplete="email" />
            <Clerk.FieldError className={errorTextClass} />
          </Clerk.Field>
          <Clerk.Field name="password" className={fieldClass}>
            <Clerk.Label className={labelClass}>Password</Clerk.Label>
            <Clerk.Input className={inputClass} type="password" autoComplete="new-password" />
            <Clerk.FieldError className={errorTextClass} />
          </Clerk.Field>
          <SignUp.Captcha className="flex justify-center" />
          <SignUp.Action submit asChild>
            <Button type="submit" size="lg" className="w-full">
              Continue
            </Button>
          </SignUp.Action>
        </div>
      </SignUp.Step>

      <SignUp.Step name="continue">
        <h2 className={stepTitleClass}>Almost there</h2>
        <p className={stepSubtitleClass}>
          Add the details needed to finish creating your account.
        </p>
        <Clerk.GlobalError className={cn('mb-3 text-center', errorTextClass)} />
        <div className="flex flex-col gap-4">
          <Clerk.Field name="firstName" className={fieldClass}>
            <Clerk.Label className={labelClass}>First name</Clerk.Label>
            <Clerk.Input className={inputClass} autoComplete="given-name" />
            <Clerk.FieldError className={errorTextClass} />
          </Clerk.Field>
          <Clerk.Field name="lastName" className={fieldClass}>
            <Clerk.Label className={labelClass}>Last name</Clerk.Label>
            <Clerk.Input className={inputClass} autoComplete="family-name" />
            <Clerk.FieldError className={errorTextClass} />
          </Clerk.Field>
          <SignUp.Action submit asChild>
            <Button type="submit" size="lg" className="w-full">
              Continue
            </Button>
          </SignUp.Action>
        </div>
      </SignUp.Step>

      <SignUp.Step name="verifications">
        <SignUp.Strategy name="email_code">
          <VerificationChrome title="Check your email">
            <p className="text-center text-sm text-muted-foreground">
              Enter the code we sent to your email.
            </p>
            <Clerk.Field name="code" className={fieldClass}>
              <Clerk.Label className={labelClass}>Email code</Clerk.Label>
              <Clerk.Input className={inputClass} />
              <Clerk.FieldError className={errorTextClass} />
            </Clerk.Field>
            <SignUp.Action submit asChild>
              <Button type="submit" size="lg" className="w-full">
                Verify
              </Button>
            </SignUp.Action>
            <SignUp.Action
              resend
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full',
              )}
              fallback={({ resendableAfter }) => (
                <span className="text-center text-xs text-muted-foreground">
                  Resend code in {resendableAfter}s
                </span>
              )}
            >
              Resend code
            </SignUp.Action>
          </VerificationChrome>
        </SignUp.Strategy>
      </SignUp.Step>

      <SignUp.Step name="restricted">
        <h2 className={stepTitleClass}>Restricted</h2>
        <Clerk.GlobalError className={cn('text-center', errorTextClass)} />
      </SignUp.Step>
    </SignUp.Root>
  );
}
