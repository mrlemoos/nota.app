import * as Clerk from '@clerk/elements/common';
import * as SignIn from '@clerk/elements/sign-in';
import * as SignUp from '@clerk/elements/sign-up';
import type { JSX } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fieldGroupClass = 'flex flex-col gap-2';
const labelClass = 'text-sm font-medium leading-none text-foreground';
const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';
const primarySubmitClass = cn(
  buttonVariants({ variant: 'default', size: 'lg', className: 'w-full' }),
);
/** Vertical rhythm inside each Clerk step (fields + actions). */
const stepStackClass = 'flex flex-col gap-4';
const rootStackClass = 'flex flex-col gap-6';

const authFallback = (
  <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
);

/**
 * Composable Clerk Elements flows with `routing="hash"` for the Nota Vite SPA.
 * Email/password (and verification steps) per dashboard-enabled strategies.
 */
export function NotaClerkSignIn(): JSX.Element {
  return (
    <SignIn.Root path="/sign-in" routing="hash" fallback={authFallback}>
      <div className={rootStackClass}>
        <Clerk.GlobalError className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" />

        <SignIn.Step name="start">
          <div className={stepStackClass}>
            <Clerk.Field name="identifier" className={fieldGroupClass}>
              <Clerk.Label className={labelClass}>Email</Clerk.Label>
              <Clerk.Input
                type="email"
                className={inputClass}
                autoComplete="email"
                autoCapitalize="none"
              />
              <Clerk.FieldError className="text-sm text-destructive" />
            </Clerk.Field>

            <SignIn.Action submit className={primarySubmitClass}>
              Continue
            </SignIn.Action>
          </div>
        </SignIn.Step>

        <SignIn.Step name="verifications">
          <div className={stepStackClass}>
            <SignIn.Strategy name="password">
              <div className={stepStackClass}>
                <Clerk.Field name="password" className={fieldGroupClass}>
                  <Clerk.Label className={labelClass}>Password</Clerk.Label>
                  <Clerk.Input
                    type="password"
                    className={inputClass}
                    autoComplete="current-password"
                  />
                  <Clerk.FieldError className="text-sm text-destructive" />
                </Clerk.Field>
                <SignIn.Action submit className={primarySubmitClass}>
                  Sign in
                </SignIn.Action>
                <SignIn.Action
                  navigate="choose-strategy"
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      className: 'w-full',
                    }),
                  )}
                >
                  Use another method
                </SignIn.Action>
              </div>
            </SignIn.Strategy>

            <SignIn.Strategy name="email_link">
              <div className={stepStackClass}>
                <h2 className="text-lg font-semibold text-foreground">
                  Check your email
                </h2>
                <p className="text-sm text-muted-foreground">
                  We sent a link to <SignIn.SafeIdentifier />. Open it to
                  continue signing in.
                </p>
                <SignIn.Action
                  resend
                  className={cn(
                    buttonVariants({
                      variant: 'outline',
                      size: 'default',
                      className: 'w-full',
                    }),
                  )}
                >
                  Resend link
                </SignIn.Action>
                <SignIn.Action
                  navigate="choose-strategy"
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      className: 'w-full',
                    }),
                  )}
                >
                  Use another method
                </SignIn.Action>
              </div>
            </SignIn.Strategy>

            <SignIn.Strategy name="email_code">
              <div className={stepStackClass}>
                <p className="text-sm text-muted-foreground">
                  We sent a code to <SignIn.SafeIdentifier />.
                </p>
                <Clerk.Field name="code" className={fieldGroupClass}>
                  <Clerk.Label className={labelClass}>
                    Verification code
                  </Clerk.Label>
                  <Clerk.Input type="otp" className={inputClass} />
                  <Clerk.FieldError className="text-sm text-destructive" />
                </Clerk.Field>
                <div className="flex flex-col gap-3">
                  <SignIn.Action submit className={primarySubmitClass}>
                    Verify
                  </SignIn.Action>
                  <SignIn.Action
                    resend
                    className={cn(
                      buttonVariants({
                        variant: 'ghost',
                        size: 'default',
                        className: 'w-full',
                      }),
                    )}
                  >
                    Resend code
                  </SignIn.Action>
                </div>
                <SignIn.Action
                  navigate="choose-strategy"
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      className: 'w-full',
                    }),
                  )}
                >
                  Use another method
                </SignIn.Action>
              </div>
            </SignIn.Strategy>

            <SignIn.Strategy name="reset_password_email_code">
              <div className={stepStackClass}>
                <p className="text-sm text-muted-foreground">
                  We sent a code to <SignIn.SafeIdentifier />.
                </p>
                <Clerk.Field name="code" className={fieldGroupClass}>
                  <Clerk.Label className={labelClass}>
                    Verification code
                  </Clerk.Label>
                  <Clerk.Input type="otp" className={inputClass} />
                  <Clerk.FieldError className="text-sm text-destructive" />
                </Clerk.Field>
                <div className="flex flex-col gap-3">
                  <SignIn.Action submit className={primarySubmitClass}>
                    Continue
                  </SignIn.Action>
                  <SignIn.Action
                    resend
                    className={cn(
                      buttonVariants({
                        variant: 'ghost',
                        size: 'default',
                        className: 'w-full',
                      }),
                    )}
                  >
                    Resend code
                  </SignIn.Action>
                </div>
              </div>
            </SignIn.Strategy>
          </div>
        </SignIn.Step>

        <SignIn.Step name="choose-strategy">
          <div className={stepStackClass}>
            <p className="text-sm text-muted-foreground">
              Choose another way to sign in.
            </p>
            <div className="flex flex-col gap-3">
              <SignIn.SupportedStrategy name="password" asChild>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: 'outline', className: 'w-full' }),
                  )}
                >
                  Password
                </button>
              </SignIn.SupportedStrategy>
              <SignIn.SupportedStrategy name="email_code" asChild>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: 'outline', className: 'w-full' }),
                  )}
                >
                  Email code
                </button>
              </SignIn.SupportedStrategy>
              <SignIn.SupportedStrategy name="email_link" asChild>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: 'outline', className: 'w-full' }),
                  )}
                >
                  Email link
                </button>
              </SignIn.SupportedStrategy>
            </div>
          </div>
        </SignIn.Step>

        <SignIn.Step name="forgot-password">
          <div className={stepStackClass}>
            <SignIn.Action
              navigate="start"
              className={cn(
                buttonVariants({ variant: 'ghost', className: 'w-full' }),
              )}
            >
              Back
            </SignIn.Action>
          </div>
        </SignIn.Step>

        <SignIn.Step name="reset-password">
          <div className={stepStackClass}>
            <Clerk.Field name="password" className={fieldGroupClass}>
              <Clerk.Label className={labelClass}>New password</Clerk.Label>
              <Clerk.Input
                type="password"
                className={inputClass}
                autoComplete="new-password"
              />
              <Clerk.FieldError className="text-sm text-destructive" />
            </Clerk.Field>
            <SignIn.Action submit className={primarySubmitClass}>
              Save password
            </SignIn.Action>
          </div>
        </SignIn.Step>

        <SignIn.Step name="sso-callback">
          <SignIn.Captcha />
        </SignIn.Step>
      </div>
    </SignIn.Root>
  );
}

export function NotaClerkSignUp(): JSX.Element {
  return (
    <SignUp.Root path="/sign-up" routing="hash" fallback={authFallback}>
      <div className={rootStackClass}>
        <Clerk.GlobalError className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" />

        <SignUp.Step name="start">
          <div className={stepStackClass}>
            <Clerk.Field name="emailAddress" className={fieldGroupClass}>
              <Clerk.Label className={labelClass}>Email</Clerk.Label>
              <Clerk.Input
                type="email"
                className={inputClass}
                autoComplete="email"
                autoCapitalize="none"
              />
              <Clerk.FieldError className="text-sm text-destructive" />
            </Clerk.Field>

            <Clerk.Field name="password" className={fieldGroupClass}>
              <Clerk.Label className={labelClass}>Password</Clerk.Label>
              <Clerk.Input
                type="password"
                className={inputClass}
                autoComplete="new-password"
              />
              <Clerk.FieldError className="text-sm text-destructive" />
            </Clerk.Field>

            <SignUp.Action submit className={primarySubmitClass}>
              Continue
            </SignUp.Action>
          </div>
        </SignUp.Step>

        <SignUp.Step name="continue">
          <div className={stepStackClass}>
            <Clerk.Field name="firstName" className={fieldGroupClass}>
              <Clerk.Label className={labelClass}>First name</Clerk.Label>
              <Clerk.Input
                type="text"
                className={inputClass}
                autoComplete="given-name"
              />
              <Clerk.FieldError className="text-sm text-destructive" />
            </Clerk.Field>
            <Clerk.Field name="lastName" className={fieldGroupClass}>
              <Clerk.Label className={labelClass}>Last name</Clerk.Label>
              <Clerk.Input
                type="text"
                className={inputClass}
                autoComplete="family-name"
              />
              <Clerk.FieldError className="text-sm text-destructive" />
            </Clerk.Field>
            <SignUp.Action submit className={primarySubmitClass}>
              Continue
            </SignUp.Action>
          </div>
        </SignUp.Step>

        <SignUp.Step name="verifications">
          <SignUp.Strategy name="email_code">
            <div className={stepStackClass}>
              <p className="text-sm text-muted-foreground">
                We sent a code to your email.
              </p>
              <Clerk.Field name="code" className={fieldGroupClass}>
                <Clerk.Label className={labelClass}>
                  Verification code
                </Clerk.Label>
                <Clerk.Input type="otp" className={inputClass} />
                <Clerk.FieldError className="text-sm text-destructive" />
              </Clerk.Field>
              <div className="flex flex-col gap-3">
                <SignUp.Action submit className={primarySubmitClass}>
                  Verify
                </SignUp.Action>
                <SignUp.Action
                  resend
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      size: 'default',
                      className: 'w-full',
                    }),
                  )}
                >
                  Resend code
                </SignUp.Action>
              </div>
            </div>
          </SignUp.Strategy>
        </SignUp.Step>
      </div>
    </SignUp.Root>
  );
}
